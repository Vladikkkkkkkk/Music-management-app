import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import axios from "axios";

Modal.setAppElement("#root");

const TrackFormModal = ({ isOpen, onRequestClose, trackToEdit }) => {
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    album: "",
    coverImage: "",
    genres: [],
  });
  const [genresList, setGenresList] = useState([]);
  const [newGenre, setNewGenre] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/genres");
        setGenresList(response.data);
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    if (trackToEdit) {
      setFormData({
        title: trackToEdit.title || "",
        artist: trackToEdit.artist || "",
        album: trackToEdit.album || "",
        coverImage: trackToEdit.coverImage || "",
        genres: trackToEdit.genres || [],
      });
    } else {
      setFormData({ title: "", artist: "", album: "", coverImage: "", genres: [] });
    }
  }, [trackToEdit]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.artist) newErrors.artist = "Artist is required";
    if (formData.coverImage && !/^https?:\/\/.+/i.test(formData.coverImage)) {
        newErrors.coverImage = "Invalid image URL";
      }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (trackToEdit) {
        await axios.put(`http://127.0.0.1:8000/api/tracks/${trackToEdit.id}`, formData);
      } else {
        await axios.post("http://127.0.0.1:8000/api/tracks", formData);
      }
      onRequestClose();
    } catch (error) {
      console.error("Error saving track:", error);
      if (error.response) {
        setErrors((prev) => ({
          ...prev,
          form: error.response.data.error || "Failed to save track",
        }));
      }
    }
  };

  const addGenre = () => {
    if (newGenre && !formData.genres.includes(newGenre)) {
      setFormData({ ...formData, genres: [...formData.genres, newGenre] });
      setNewGenre("");
    }
  };

  const removeGenre = (genre) => {
    setFormData({ ...formData, genres: formData.genres.filter((g) => g !== genre) });
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="modal-content p-6 rounded-lg shadow-lg max-w-md mx-auto mt-20"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
    >
      <div data-testid="track-form">
        <h2 className="text-xl font-bold mb-4 text-gray-100">
          {trackToEdit ? "Edit Track" : "Create Track"}
        </h2>
        {errors.form && (
          <p className="text-red-400 text-sm mb-4">{errors.form}</p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-1 text-gray-300">Title</label>
            <input
              data-testid="input-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="p-2 border rounded w-full"
            />
            {errors.title && (
              <p data-testid="error-title" className="text-red-400 text-sm">
                {errors.title}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-gray-300">Artist</label>
            <input
              data-testid="input-artist"
              type="text"
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              className="p-2 border rounded w-full"
            />
            {errors.artist && (
              <p data-testid="error-artist" className="text-red-400 text-sm">
                {errors.artist}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-gray-300">Album</label>
            <input
              data-testid="input-album"
              type="text"
              value={formData.album}
              onChange={(e) => setFormData({ ...formData, album: e.target.value })}
              className="p-2 border rounded w-full"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-gray-300">Cover Image URL</label>
            <input
              data-testid="input-cover-image"
              type="text"
              value={formData.coverImage}
              onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
              className="p-2 border rounded w-full"
            />
            {errors.coverImage && (
              <p data-testid="error-cover-image" className="text-red-400 text-sm">
                {errors.coverImage}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-1 text-gray-300">Genres</label>
            <div className="flex gap-2 mb-2">
              <select
                data-testid="genre-selector"
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                className="p-2 border rounded flex-1"
              >
                <option value="">Select a genre</option>
                {genresList.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addGenre}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.genres.map((genre) => (
                <span
                  key={genre}
                  className="bg-indigo-600 text-white px-2 py-1 rounded flex items-center text-sm"
                >
                  {genre}
                  <button
                    type="button"
                    onClick={() => removeGenre(genre)}
                    className="ml-1 text-red-400 hover:text-red-300"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              data-testid="submit-button"
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              {trackToEdit ? "Update" : "Create"}
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
      </div>
    </Modal>
  );
};

export default TrackFormModal;