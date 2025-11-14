import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Upload, Zap, BookOpen, Database, Network, Code, Cpu, FileText, Sparkles, Bell, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BTECH_TOPICS = [
  { id: "dsa", name: "Data Structures & Algorithms", icon: Code, color: "from-blue-500 to-cyan-500" },
  { id: "dbms", name: "Database Management Systems", icon: Database, color: "from-purple-500 to-pink-500" },
  { id: "cn", name: "Computer Networks", icon: Network, color: "from-green-500 to-emerald-500" },
  { id: "os", name: "Operating Systems", icon: Cpu, color: "from-orange-500 to-red-500" },
  { id: "oops", name: "Object Oriented Programming", icon: BookOpen, color: "from-indigo-500 to-purple-500" },
  { id: "web", name: "Web Technologies", icon: Code, color: "from-pink-500 to-rose-500" }
];

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadMode, setUploadMode] = useState(false);
  const [error, setError] = useState("");
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndQuizzes();
  }, []);

  const loadUserAndQuizzes = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load quizzes assigned to this user
      const allQuizzes = await base44.entities.Quiz.list("-created_date");
      const userQuizzes = allQuizzes.filter(quiz => 
        quiz.is_public === false && 
        quiz.assigned_users && 
        quiz.assigned_users.includes(currentUser.email)
      );
      setAssignedQuizzes(userQuizzes);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const generateQuiz = async () => {
    if (!uploadMode && !selectedTopic) {
      setError("Please select a topic");
      return;
    }
    if (uploadMode && !uploadedFile) {
      setError("Please upload a PDF file");
      return;
    }

    setGenerating(true);
    setError("");

    try {
      let quizData;

      if (uploadMode) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadedFile });
        
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this document and create ${numQuestions} multiple choice questions based on its content. 
          Each question should have 4 options and include an explanation for the correct answer.
          Make the questions ${difficulty} difficulty level.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              topic: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correct_answer: { type: "string" },
                    explanation: { type: "string" }
                  }
                }
              }
            }
          }
        });

        quizData = result;
      } else {
        const topicName = BTECH_TOPICS.find(t => t.id === selectedTopic)?.name;
        
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Create ${numQuestions} multiple choice questions about ${topicName} for B.Tech students.
          Difficulty level: ${difficulty}.
          Each question should:
          - Be clear and specific
          - Have exactly 4 options (A, B, C, D)
          - Have only one correct answer
          - Include a detailed explanation for the correct answer
          - Cover important concepts in ${topicName}
          
          Make the questions diverse and cover different aspects of the topic.`,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              topic: { type: "string" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" } },
                    correct_answer: { type: "string" },
                    explanation: { type: "string" }
                  }
                }
              }
            }
          }
        });

        quizData = result;
      }

      const quiz = await base44.entities.Quiz.create({
        title: quizData.title,
        topic: quizData.topic,
        difficulty: difficulty,
        questions: quizData.questions,
        duration_minutes: Math.ceil(numQuestions * 1.5),
        total_questions: quizData.questions.length,
        is_public: true
      });

      navigate(createPageUrl("QuizTaking") + `?id=${quiz.id}`);
    } catch (err) {
      setError("Failed to generate quiz. Please try again.");
      console.error(err);
    }

    setGenerating(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setUploadedFile(file);
      setError("");
    } else {
      setError("Please upload a PDF file");
    }
  };

  const startAssignedQuiz = (quizId) => {
    navigate(createPageUrl("QuizTaking") + `?id=${quizId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AI Quiz Generator
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Master your B.Tech subjects with AI-powered quizzes or upload your own study material
          </p>
        </div>

        <Tabs defaultValue="generate" className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="generate">Generate Quiz</TabsTrigger>
            <TabsTrigger value="assigned">
              Assigned Quizzes
              {assignedQuizzes.length > 0 && (
                <Badge className="ml-2 bg-red-500">{assignedQuizzes.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Assigned Quizzes Tab */}
          <TabsContent value="assigned" className="mt-8">
            {assignedQuizzes.length === 0 ? (
              <Card className="max-w-2xl mx-auto shadow-xl">
                <CardContent className="pt-12 pb-12 text-center">
                  <Bell className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">No Assigned Quizzes</h3>
                  <p className="text-slate-600">Your instructor hasn't assigned any quizzes yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {assignedQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{quiz.title}</CardTitle>
                          <CardDescription>{quiz.topic}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          <Bell className="w-3 h-3 mr-1" />
                          Assigned
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Questions: {quiz.total_questions}</span>
                        <span className="text-slate-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {quiz.duration_minutes} min
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{quiz.difficulty}</Badge>
                      </div>
                      <Button
                        onClick={() => startAssignedQuiz(quiz.id)}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Quiz
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Generate Quiz Tab */}
          <TabsContent value="generate" className="mt-8">
            {/* Mode Toggle */}
            <div className="flex justify-center gap-4 mb-8">
              <Button
                variant={!uploadMode ? "default" : "outline"}
                onClick={() => setUploadMode(false)}
                className={!uploadMode ? "bg-gradient-to-r from-blue-500 to-indigo-600" : ""}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Choose Topic
              </Button>
              <Button
                variant={uploadMode ? "default" : "outline"}
                onClick={() => setUploadMode(true)}
                className={uploadMode ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!uploadMode ? (
              <>
                {/* Topic Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {BTECH_TOPICS.map((topic) => {
                    const Icon = topic.icon;
                    return (
                      <Card
                        key={topic.id}
                        className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                          selectedTopic === topic.id ? "ring-4 ring-blue-500 shadow-xl" : ""
                        }`}
                        onClick={() => setSelectedTopic(topic.id)}
                      >
                        <CardHeader>
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${topic.color} flex items-center justify-center mb-3 shadow-lg`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <CardTitle className="text-lg">{topic.name}</CardTitle>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>

                {/* Quiz Settings */}
                <Card className="max-w-2xl mx-auto shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Quiz Settings
                    </CardTitle>
                    <CardDescription>Customize your quiz experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <Select value={difficulty} onValueChange={setDifficulty}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Number of Questions</Label>
                        <Select value={numQuestions.toString()} onValueChange={(v) => setNumQuestions(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 Questions</SelectItem>
                            <SelectItem value="10">10 Questions</SelectItem>
                            <SelectItem value="15">15 Questions</SelectItem>
                            <SelectItem value="20">20 Questions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={generateQuiz}
                      disabled={generating || !selectedTopic}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-lg py-6"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          Generating Quiz...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate Quiz
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="max-w-2xl mx-auto shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-500" />
                    Upload Study Material
                  </CardTitle>
                  <CardDescription>Upload a PDF to generate custom quiz questions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="pdf-upload">Upload PDF File</Label>
                    <Input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {uploadedFile && (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {uploadedFile.name}
                      </p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Difficulty Level</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Questions</Label>
                      <Select value={numQuestions.toString()} onValueChange={(v) => setNumQuestions(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 Questions</SelectItem>
                          <SelectItem value="10">10 Questions</SelectItem>
                          <SelectItem value="15">15 Questions</SelectItem>
                          <SelectItem value="20">20 Questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={generateQuiz}
                    disabled={generating || !uploadedFile}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-lg py-6"
                  >
                    {generating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Analyzing PDF & Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Quiz from PDF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
