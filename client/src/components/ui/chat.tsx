import React, { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { ChatMessageResponse } from "@shared/schema";

interface ChatProps {
  messages: ChatMessageResponse[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  suggestedQuestions?: string[];
}

const Chat: React.FC<ChatProps> = ({
  messages,
  onSendMessage,
  isLoading = false,
  suggestedQuestions = [],
}) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      setMessage("");
      await onSendMessage(message);
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    if (!isLoading) {
      setMessage("");
      await onSendMessage(question);
    }
  };

  return (
    <div className="h-[500px] flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start ${
              msg.role === "user" ? "justify-end" : ""
            }`}
          >
            {msg.role === "ai" && (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mr-3">
                <i className="fas fa-robot text-primary-600"></i>
              </div>
            )}
            
            <div
              className={`p-3 rounded-lg max-w-[80%] ${
                msg.role === "user"
                  ? "bg-gray-100 chat-message-user"
                  : "bg-primary-50 chat-message-ai"
              }`}
            >
              <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
            </div>
            
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 ml-3">
                <i className="fas fa-user text-gray-600"></i>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mr-3">
              <i className="fas fa-robot text-primary-600"></i>
            </div>
            <div className="bg-primary-50 p-3 rounded-lg chat-message-ai">
              <div className="flex space-x-2">
                <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce"></div>
                <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="h-2 w-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4">
        <form className="flex items-center" onSubmit={handleSubmit}>
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ask a question about your career path..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            type="submit"
            disabled={isLoading || !message.trim()}
            className="ml-3 bg-primary-600 text-white rounded-lg p-2 hover:bg-primary-700 transition"
          >
            <i className="fas fa-paper-plane"></i>
          </Button>
        </form>

        {suggestedQuestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 py-1 px-2 rounded-md transition"
                onClick={() => handleSuggestedQuestion(question)}
                disabled={isLoading}
              >
                {question.length > 30 ? `${question.substring(0, 27)}...` : question}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
