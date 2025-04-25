import React, { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  accept = ".pdf,.docx",
  maxSize = 5 * 1024 * 1024, // 5MB default
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `File size should not exceed ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive",
      });
      return false;
    }

    // Check file type
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const allowedExtensions = accept.split(",");
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: `Only ${accept} files are allowed`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelected(file);
      }
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelected(file);
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
        isDragging ? "bg-gray-50 border-primary-400" : "border-gray-300 hover:bg-gray-50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
    >
      <div className="mb-4">
        {selectedFile ? (
          <i className="fas fa-file-alt text-primary-600 text-5xl"></i>
        ) : (
          <i className="fas fa-file-upload text-primary-400 text-5xl"></i>
        )}
      </div>
      
      {selectedFile ? (
        <>
          <p className="text-lg font-medium text-gray-700 mb-2">{selectedFile.name}</p>
          <p className="text-sm text-gray-500 mb-2">
            {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'Unknown type'}
          </p>
          <button 
            className="replace-button mt-2 px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-medium text-sm"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the parent div click
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
              onFileSelected(null as any); // Notify parent component that file is removed
            }}
          >
            Replace File
          </button>
        </>
      ) : (
        <>
          <p className="text-lg font-medium text-gray-700 mb-2">Drag and drop your file here</p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <button 
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition font-medium"
          >
            Browse Files
          </button>
        </>
      )}
      
      <p className="mt-4 text-xs text-gray-500">
        Supported formats: PDF, DOCX (Max {maxSize / (1024 * 1024)}MB)
      </p>
      
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileSelection}
      />
    </div>
  );
};

export default FileUpload;
