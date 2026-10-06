"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

type SelectedFile = {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  preview: string | null;
};

type FileUploadProps = {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onFilesSelect?: (files: SelectedFile[]) => void;
  onFilesRemove?: (files: SelectedFile[]) => void;
  disabled?: boolean;
  className?: string;
};

const FileUpload = ({
  accept = "*/*",
  multiple = false,
  maxSize = 5 * 1024 * 1024, // 5MB
  onFilesSelect = () => {},
  onFilesRemove = () => {},
  disabled = false,
  className = "",
}: FileUploadProps) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  const validateFile = (file: File) => {
    const fileErrors: string[] = [];

    if (file.size > maxSize) {
      fileErrors.push(`File size exceeds ${(maxSize / (1024 * 1024)).toFixed(1)}MB limit`);
    }

    if (
      accept !== "*/*" &&
      !accept.split(",").some((type) => file.type.match(type.trim().replace("*", ".*")))
    ) {
      fileErrors.push(`File type not supported`);
    }

    return fileErrors;
  };

  const processFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: SelectedFile[] = [];
      const fileErrors: string[] = [];

      fileArray.forEach((file) => {
        const fileValidationErrors = validateFile(file);
        if (fileValidationErrors.length === 0) {
          validFiles.push({
            file,
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            preview: previewUrlFor(file),
          });
        } else {
          fileErrors.push(`${file.name}: ${fileValidationErrors.join(", ")}`);
        }
      });

      if (!multiple) {
        files.forEach((item) => {
          if (item.preview) URL.revokeObjectURL(item.preview);
        });
        const next = validFiles.slice(0, 1);
        setFiles(next);
        setActiveId(next[0]?.id ?? null);
        onFilesSelect(next);
      } else {
        const updatedFiles = [...files, ...validFiles];
        setFiles(updatedFiles);
        setActiveId((current) => current ?? validFiles[0]?.id ?? null);
        onFilesSelect(updatedFiles);
      }

      setErrors(fileErrors);
    },
    [files, multiple, maxSize, accept, onFilesSelect],
  );

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragOver(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;

    setIsDragOver(false);
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter((file) => file.id !== fileId);
    setFiles(updatedFiles);
    setActiveId((current) => (current === fileId ? (updatedFiles[0]?.id ?? null) : current));
    onFilesRemove(updatedFiles);

    const fileToRemove = files.find((file) => file.id === fileId);
    if (fileToRemove && fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎥";
    if (type.startsWith("audio/")) return "🎵";
    if (type.includes("pdf")) return "📄";
    if (type.includes("document") || type.includes("word")) return "📝";
    if (type.includes("spreadsheet") || type.includes("excel")) return "📊";
    return "📎";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200
          ${disabled ? "cursor-not-allowed opacity-50" : ""}
          ${isDragOver ? "border-ring bg-muted/50" : "border-input hover:border-border hover:bg-muted/20"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />

        <div className="space-y-3">
          <div className="text-4xl">📁</div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {isDragOver ? "Drop files here" : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground">
              {accept === "*/*" ? "Any file type" : accept} • Max {(maxSize / (1024 * 1024)).toFixed(1)}MB
              {multiple ? " • Multiple files allowed" : " • Single file only"}
            </p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-xs text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Selected files ({files.length})</h4>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 rounded-md border bg-muted/20 p-3 ${
                  file.id === activeId ? "border-ring" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveId(file.id);
                  }}
                  className="shrink-0"
                  aria-label={`Preview ${file.name}`}
                >
                  <FileThumb file={file} icon={getFileIcon(file.type)} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFile(file.id);
                  }}
                  disabled={disabled}
                  className="text-muted-foreground hover:text-destructive transition-colors duration-200 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <FilePreview file={files.find((item) => item.id === activeId) ?? files[0]} iconFor={getFileIcon} />
        </div>
      )}
    </div>
  );
};

function previewUrlFor(file: File) {
  if (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/") ||
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    return URL.createObjectURL(file);
  }
  return null;
}

function FileThumb({ file, icon }: { file: SelectedFile; icon: string }) {
  if (file.preview && file.type.startsWith("image/")) {
    return <img src={file.preview} alt="" className="h-14 w-14 rounded-md object-cover" />;
  }
  if (file.preview && file.type.startsWith("video/")) {
    return <video src={file.preview} muted className="h-14 w-14 rounded-md object-cover" />;
  }
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-md border bg-background text-lg">{icon}</span>
  );
}

function FilePreview({ file, iconFor }: { file: SelectedFile; iconFor: (type: string) => string }) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <p className="border-b px-3 py-2 text-xs text-muted-foreground">Preview</p>
      {file.preview && file.type.startsWith("image/") ? (
        <img src={file.preview} alt={file.name} className="max-h-80 w-full object-contain" />
      ) : null}
      {file.preview && file.type.startsWith("video/") ? (
        <video src={file.preview} controls className="max-h-80 w-full" />
      ) : null}
      {file.preview && file.type.startsWith("audio/") ? (
        <div className="p-4">
          <audio src={file.preview} controls className="w-full" />
        </div>
      ) : null}
      {file.preview && isPdf ? (
        <iframe title={file.name} src={file.preview} className="h-80 w-full bg-white" />
      ) : null}
      {!file.preview ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <span className="text-3xl">{iconFor(file.type)}</span>
          <p className="text-sm text-muted-foreground">No preview for this file type</p>
        </div>
      ) : null}
    </div>
  );
}

const FileUploadDemo = () => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadType, setUploadType] = useState<"any" | "images" | "documents" | "media">("any");
  const [isMultiple, setIsMultiple] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);

  const acceptTypes = {
    any: "*/*",
    images: "image/*",
    documents: ".pdf,.doc,.docx,.txt",
    media: "image/*,video/*,audio/*",
  };

  const handleFilesSelect = (nextFiles: SelectedFile[]) => {
    setSelectedFiles(nextFiles);
    console.log("Files selected:", nextFiles);
  };

  const handleFilesRemove = (nextFiles: SelectedFile[]) => {
    setSelectedFiles(nextFiles);
    console.log("Files updated:", nextFiles);
  };

  const clearAll = () => {
    setSelectedFiles([]);
  };

  return (
    <div className="file-upload-demo min-h-screen bg-background text-foreground transition-colors duration-300">
      <style>{`
        .file-upload-demo {
          --background: 0 0% 100%;
          --foreground: 222.2 84% 4.9%;
          --card: 0 0% 100%;
          --card-foreground: 222.2 84% 4.9%;
          --popover: 0 0% 100%;
          --popover-foreground: 222.2 84% 4.9%;
          --primary: 222.2 47.4% 11.2%;
          --primary-foreground: 210 40% 98%;
          --secondary: 210 40% 96%;
          --secondary-foreground: 222.2 47.4% 11.2%;
          --muted: 210 40% 96%;
          --muted-foreground: 215.4 16.3% 46.9%;
          --accent: 210 40% 96%;
          --accent-foreground: 222.2 47.4% 11.2%;
          --destructive: 0 84.2% 60.2%;
          --destructive-foreground: 210 40% 98%;
          --border: 214.3 31.8% 91.4%;
          --input: 214.3 31.8% 91.4%;
          --ring: 222.2 47.4% 11.2%;
          --radius: 0.5rem;
        }

        .dark .file-upload-demo {
          --background: 222.2 84% 4.9%;
          --foreground: 210 40% 98%;
          --card: 222.2 84% 4.9%;
          --card-foreground: 210 40% 98%;
          --popover: 222.2 84% 4.9%;
          --popover-foreground: 210 40% 98%;
          --primary: 210 40% 98%;
          --primary-foreground: 222.2 47.4% 11.2%;
          --secondary: 217.2 32.6% 17.5%;
          --secondary-foreground: 210 40% 98%;
          --muted: 217.2 32.6% 17.5%;
          --muted-foreground: 215 20.2% 65.1%;
          --accent: 217.2 32.6% 17.5%;
          --accent-foreground: 210 40% 98%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 210 40% 98%;
          --border: 217.2 32.6% 17.5%;
          --input: 217.2 32.6% 17.5%;
          --ring: 212.7 26.8% 83.9%;
        }

        .file-upload-demo .bg-background { background-color: hsl(var(--background)); }
        .file-upload-demo .text-foreground { color: hsl(var(--foreground)); }
        .file-upload-demo .bg-card { background-color: hsl(var(--card)); }
        .file-upload-demo .text-card-foreground { color: hsl(var(--card-foreground)); }
        .file-upload-demo .bg-muted { background-color: hsl(var(--muted)); }
        .file-upload-demo .text-muted-foreground { color: hsl(var(--muted-foreground)); }
        .file-upload-demo .bg-secondary { background-color: hsl(var(--secondary)); }
        .file-upload-demo .text-secondary-foreground { color: hsl(var(--secondary-foreground)); }
        .file-upload-demo .border-input { border-color: hsl(var(--input)); }
        .file-upload-demo .border-border { border-color: hsl(var(--border)); }
        .file-upload-demo .border-ring { border-color: hsl(var(--ring)); }
        .file-upload-demo .border-destructive { border-color: hsl(var(--destructive)); }
        .file-upload-demo .text-destructive { color: hsl(var(--destructive)); }
        .file-upload-demo .bg-muted\\/20 { background-color: hsl(var(--muted) / 0.2); }
        .file-upload-demo .bg-muted\\/50 { background-color: hsl(var(--muted) / 0.5); }
        .file-upload-demo .hover\\:bg-muted\\/20:hover { background-color: hsl(var(--muted) / 0.2); }
        .file-upload-demo .hover\\:text-destructive:hover { color: hsl(var(--destructive)); }
        .file-upload-demo .hover\\:border-border:hover { border-color: hsl(var(--border)); }
        .file-upload-demo .hover\\:bg-accent:hover { background-color: hsl(var(--accent)); }
        .file-upload-demo .hover\\:text-accent-foreground:hover { color: hsl(var(--accent-foreground)); }
        .file-upload-demo .hover\\:bg-secondary\\/80:hover { background-color: hsl(var(--secondary) / 0.8); }
      `}</style>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <div className="space-y-2 mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">File Upload</h1>
              <p className="text-sm text-muted-foreground">Upload your files with drag and drop support</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">File Type</label>
                <select
                  value={uploadType}
                  onChange={(event) => setUploadType(event.target.value as typeof uploadType)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  <option value="any">Any file</option>
                  <option value="images">Images only</option>
                  <option value="documents">Documents</option>
                  <option value="media">Media files</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Multiple Files</label>
                <button
                  onClick={() => setIsMultiple(!isMultiple)}
                  className={`w-full rounded-md border px-3 py-2 text-sm transition-colors ${
                    isMultiple
                      ? "bg-secondary text-secondary-foreground border-input"
                      : "bg-background border-input hover:bg-accent"
                  }`}
                >
                  {isMultiple ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">State</label>
                <button
                  onClick={() => setIsDisabled(!isDisabled)}
                  className={`w-full rounded-md border px-3 py-2 text-sm transition-colors ${
                    isDisabled
                      ? "bg-secondary text-secondary-foreground border-input"
                      : "bg-background border-input hover:bg-accent"
                  }`}
                >
                  {isDisabled ? "Disabled" : "Enabled"}
                </button>
              </div>
            </div>

            <FileUpload
              accept={acceptTypes[uploadType]}
              multiple={isMultiple}
              maxSize={10 * 1024 * 1024}
              onFilesSelect={handleFilesSelect}
              onFilesRemove={handleFilesRemove}
              disabled={isDisabled}
            />

            {selectedFiles.length > 0 && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={clearAll}
                  disabled={isDisabled}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2"
                >
                  Clear All
                </button>
                <button
                  disabled={isDisabled}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                  Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadDemo;
