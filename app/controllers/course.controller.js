const db = require("../models");
const Course = db.course;
const axios = require("axios");
const { OpenAI } = require("openai");
const { YoutubeTranscript } = require("youtube-transcript");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const createCourse = async (req, res) => {
  const userId = req.params.userId;
  const { subject, manualChapters, numChapters, title, description } = req.body;

  let chaptersArray;

  if (manualChapters && manualChapters.length > 0) {
    chaptersArray = manualChapters;
  } else {
    const format = {
      chapters: [
        {
          title: "chapter of title with max length of 15 words",
          topics: [
            { title: "topic of title with max length of 15 words" },
            { title: "topic of title with max length of 15 words" },
            { title: "topic of title with max length of 15 words" },
          ],
        },
      ],
    };

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI that is able to generate courses with individual sub-topics on any subject, store all chapters and topics in a JSON array. Generate up to 7 chapters, depending on the complexity of the subject. \nYou are to output the following in json format: ${JSON.stringify(
              format
            )} \nDo not put quotation marks or escape character \\ in the output fields.`,
          },
          {
            role: "user",
            content: `Generate a comprehensive course based on ${subject} with ${numChapters} chapters and 3 topics per chapter.`,
          },
        ],
        temperature: 0.9,
        max_tokens: 1000,
        frequency_penalty: 0.0,
        presence_penalty: 0.6,
        stop: [" Human:", " AI:"],
      });

      let message =
        response.choices[0].message?.content?.replace(/'/g, '"') ?? "";
      message = message.replace(/(\w)"(\w)/g, "$1'$2");

      const startIndex = message.indexOf("[");
      const endIndex = message.lastIndexOf("]") + 1;

      const jsonArrayString = message.slice(startIndex, endIndex);
      chaptersArray = JSON.parse(jsonArrayString);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating course content");
      return;
    }
  }
  let randomTime = Math.floor(Math.random() * (610 - 560 + 1) + 560);
  const time = chaptersArray.length * 3 * randomTime;

  let checkDescription = "";
  let checkTitle = "";
  if (description == "") {
    checkDescription = `AI Generated Course for ${subject}`;
  } else {
    checkDescription = description;
  }

  if (title == "") {
    checkTitle = `${subject} Course`;
  } else {
    checkTitle = title;
  }
  let imageUrl = "";

  // console.log(index);
  // console.log(unsplashResponse.data.results);
  while (imageUrl == "") {
    const unsplashResponse = await axios.get(
      "https://api.unsplash.com/search/photos",
      {
        params: { query: subject, per_page: 10 },
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    min = Math.ceil(0);
    max = Math.floor(9);

    index = Math.floor(Math.random() * (max - min)) + min;
    imageUrl = unsplashResponse.data.results[index]?.urls?.small || "";
  }
  try {
    const course = new Course({
      title: checkTitle,
      description: checkDescription,
      subject: subject,
      chapters: chaptersArray,
      user: userId,
      enrolledUsers: [userId],
      time: time,
      createdBy: manualChapters ? "user" : "ai",
      imageUrl: imageUrl,
    });

    const userProgress = {
      userId: userId,
      chapters: course.chapters.map((chapter) => ({
        topics: chapter.topics.map(() => ({
          completed: false,
          score: 0,
          completedAt: null,
        })),
      })),
    };

    course.userProgress.push(userProgress);
    course.enrolledUsers.push(userId);

    await course.save();

    res.send({ message: course._id, course: course });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving course");
  }
};

const generateTopics = async (req, res) => {
  const courseId = req.params.courseId;
  const course = await Course.findById(courseId);

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const totalTopics = course.chapters.reduce(
    (sum, chapter) => sum + chapter.topics.length,
    0
  );

  course.generationProgress = {
    isGenerating: true,
    currentChapter: course.generationProgress?.currentChapter || 0,
    currentTopic: course.generationProgress?.currentTopic || 0,
    totalTopics,
    completedTopics: course.generationProgress?.completedTopics || 0,
  };
  await course.save();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    for (
      let chapterIndex = course.generationProgress.currentChapter;
      chapterIndex < course.chapters.length;
      chapterIndex++
    ) {
      const chapter = course.chapters[chapterIndex];
      for (
        let topicIndex = course.generationProgress.currentTopic;
        topicIndex < chapter.topics.length;
        topicIndex++
      ) {
        const topic = chapter.topics[topicIndex];

        const videoUrl = await generateYouTubeVideo(
          topic.title,
          course.subject
        );
        const transcript = await getTranscript(videoUrl);

        if (!topic.videoUrl) {
          topic.videoUrl = videoUrl;
        }

        if (transcript && !topic.summary) {
          const summary = await generateSummary(transcript);
          topic.summary = summary.summary;
        }

        const numQuestions = 1;
        topic.conceptChecks = await getQuestion(
          topic.title,
          topic.summary,
          numQuestions
        );
        topic.generated = true;

        await Course.findOneAndUpdate(
          { _id: course._id },
          {
            $set: {
              [`chapters.${chapterIndex}.topics.${topicIndex}`]: topic,
              generationProgress: {
                completedTopics: course.generationProgress.completedTopics + 1,
                currentChapter: chapterIndex,
                currentTopic: topicIndex + 1,
                isGenerating: true,
                totalTopics: course.generationProgress.totalTopics,
              },
            },
          },
          { new: true }
        );

        res.write(
          `data: ${JSON.stringify({
            message: `Completed Chapter ${chapterIndex + 1}, Topic ${
              topicIndex + 1
            }`,
            chapterIndex,
            topicIndex,
            progress: course.generationProgress,
          })}\n\n`
        );
      }
      course.generationProgress.currentTopic = 0;
    }

    await Course.findOneAndUpdate(
      { _id: course._id },
      { $set: { "generationProgress.isGenerating": false } },
      { new: true }
    );

    res.write(
      `data: ${JSON.stringify({
        message: "All topics generated successfully",
        progress: course.generationProgress,
      })}\n\n`
    );
  } catch (error) {
    console.error(error);
    course.generationProgress.isGenerating = false;
    await course.save();

    res.write(
      `data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`
    );
  } finally {
    res.end();
  }
};

const checkGenerationStatus = async (req, res) => {
  const courseId = req.params.courseId;
  const course = await Course.findById(courseId);

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  res.json({
    isGenerating: course.generationProgress.isGenerating,
    currentChapter: course.generationProgress.currentChapter,
    currentTopic: course.generationProgress.currentTopic,
    totalTopics: course.generationProgress.totalTopics,
    completedTopics: course.generationProgress.completedTopics,
  });
};

const generateYouTubeVideo = async (title, course) => {
  try {
    const searchQuery = encodeURIComponent(`${title} for ${course}`);

    const { data } = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?key=${process.env.YOUTUBE_API_KEY}&q=${searchQuery}&videoDuration=medium&videoEmbeddable=true&type=video&maxResults=5`
    );
    console.log(" Data:", data);
    const videoId = data.items[0].id.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return videoUrl;
  } catch (error) {
    console.error(
      "Error generating YouTube video:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

const generateSummary = async (transcript) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI capable of summarising a youtube transcript, store the summary in a JSON object. \nYou are to output the following in json format: ${JSON.stringify(
            {
              summary: "summary of the transcript",
            }
          )} \nDo not put quotation marks or escape character \\ in the output fields.`,
        },
        {
          role: "user",
          content:
            "summarize in 250 words or less and do not talk of the sponsors or anything unrelated to the main topic, also do not introduce what the summary is about.\n" +
            transcript,
        },
      ],
      temperature: 0.9,
      max_tokens: 300,
      frequency_penalty: 0.0,
      presence_penalty: 0.6,
      stop: [" Human:", " AI:"],
    });

    let message = response.choices[0].message?.content;

    const startIndex = message.indexOf("{");
    const endIndex = message.lastIndexOf("}") + 1;

    const jsonObjectString = message.slice(startIndex, endIndex);
    const summary = JSON.parse(jsonObjectString);

    return summary;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getQuestion = async (title, transcript, numQuestions) => {
  const format = {
    questions: [
      {
        question: "question",
        answer: "answer with max length of 15 words",
        options: [
          "option1 with max length of 15 words",
          "option2 with max length of 15 words",
          "option3 with max length of 15 words",
          "option4 with max length of 15 words",
        ],
      },
    ],
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI that is able to generate mcq questions and answers, the length of each answer should not be more than 15 words, store all answers and questions and options in a JSON object. \nYou are to output the following in json format: ${JSON.stringify(
            format
          )} \nDo not put quotation marks or escape character \\ in the output fields.`,
        },
        {
          role: "user",
          content: `Generate ${numQuestions} random mcq questions about ${title} with context of this transcript: ${transcript}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 500,
      frequency_penalty: 0.0,
      presence_penalty: 0.6,
      stop: [" Human:", " AI:"],
    });

    let message = response.choices[0].message?.content;

    const startIndex = message.indexOf("{");
    const endIndex = message.lastIndexOf("}") + 1;

    const jsonObjectString = message.slice(startIndex, endIndex);
    const questions = JSON.parse(jsonObjectString);

    return questions.questions;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

async function getTranscript(videoId) {
  try {
    let transcript_arr = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "en",
      country: "EN",
    });
    let transcript = "";
    for (let t of transcript_arr) {
      transcript += t.text + " ";
    }
    return transcript.replaceAll("\n", "");
  } catch (error) {
    return "";
  }
}

module.exports = {
  createCourse,
  generateTopics,
  checkGenerationStatus,
  getQuestion,
};
