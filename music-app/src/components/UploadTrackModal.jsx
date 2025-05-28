import React, { useState } from "react";
import Modal from "react-modal";
import axios from "axios";

Modal.setAppElement("#root");

const UploadTrackModal = ({ isOpen, onRequestClose, track }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const validateFile = (file) => {
    const allowedTypes = ["audio/mpeg", "audio/wav"];
    const maxSize = 10 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      return "Only MP3 and WAV files are allowed";
    }
    if (file.size > maxSize) {
      return "File size must be less than 10MB";
    }
    return "";
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
    } else {
      setError("");
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`http://127.0.0.1:8000/api/tracks/${track.id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onRequestClose();
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload file");
    }
  };

  const handleRemoveFile = async () => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/tracks/${track.id}/file`);
      onRequestClose();
    } catch (error) {
      console.error("Error removing file:", error);
      setError("Failed to remove file");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="modal-content p-6 rounded-lg shadow-lg max-w-md mx-auto mt-20"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
    >
      <h2 className="text-xl font-bold mb-4 text-gray-100">Upload Track File</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-1 text-gray-300">Select File (MP3/WAV)</label>
          <input
            type="file"
            accept="audio/mpeg,audio/wav"
            onChange={handleFileChange}
            className="p-2 border rounded w-full"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        {track?.audioFile && (
          <div className="mb-4">
            <p className="text-gray-300">Current File: {track.audioFile}</p>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 mt-2"
            >
              Remove File
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!file}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-500"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={onRequestClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UploadTrackModal;