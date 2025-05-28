import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import useDebounce from "../hooks/useDebounce";
import TrackFormModal from "./TrackFormModal";
import UploadTrackModal from "./UploadTrackModal";

const fetchTracks = async ({ page = 1, limit = 10, sort = "title", order = "asc", filter = {}, search = "" }) => {
  const params = { page, limit, sort, order, ...filter, search };
  const response = await axios.get("http://127.0.0.1:8000/api/tracks", { params });
  return response.data;
};

const deleteTrack = async (id) => {
  await axios.delete(`http://127.0.0.1:8000/api/tracks/${id}`);
};

const TrackList = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sort, setSort] = useState("title");
  const [order, setOrder] = useState("asc");
  const [filter, setFilter] = useState({ genre: "", artist: "" });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [trackToEdit, setTrackToEdit] = useState(null);
  const [trackToUpload, setTrackToUpload] = useState(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [audioUrls, setAudioUrls] = useState({}); 
  const audioRef = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tracks", page, limit, sort, order, filter, debouncedSearch],
    queryFn: () => fetchTracks({ page, limit, sort, order, filter, search: debouncedSearch }),
  });

  useEffect(() => {
    if (data?.data) {
      data.data.forEach((track) => {
        if (track.audioFile) {
          const fileName = track.audioFile.split('/').pop();
          const audioUrl = `http://127.0.0.1:8000/api/files/${fileName}`;

          const cacheBuster = new Date().getTime();
          const urlWithCacheBuster = `${audioUrl}?cb=${cacheBuster}`;

          console.log(`Fetching audio for track ${track.id} from: ${urlWithCacheBuster}`);

          fetch(urlWithCacheBuster, { cache: "no-store" })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Failed to fetch audio: ${response.statusText}`);
              }
              console.log("Response headers:", response.headers.get('Content-Type'));
              return response.blob();
            })
            .then((blob) => {
              console.log("Blob type:", blob.type, "Blob size:", blob.size);
              if (blob.size === 0) {
                throw new Error("Received empty audio file");
              }
              const correctedBlob = blob.type.includes('audio/') ? blob : new Blob([blob], { type: 'audio/mpeg' });
              const url = URL.createObjectURL(correctedBlob);

              setAudioUrls((prev) => {
                if (prev[track.id] && prev[track.id] !== url) {
                  URL.revokeObjectURL(prev[track.id]); 
                }
                return { ...prev, [track.id]: url };
              });
            })
            .catch((err) => {
              console.error(`Error fetching audio for track ${track.id}:`, err);
            });
        } else {
          setAudioUrls((prev) => {
            if (prev[track.id]) {
              URL.revokeObjectURL(prev[track.id]);
              const { [track.id]: _, ...rest } = prev;
              return rest;
            }
            return prev;
          });
        }
      });
    }
  }, [data]);

  useEffect(() => {
    return () => {
      Object.values(audioUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [audioUrls]);

  const deleteMutation = useMutation({
    mutationFn: deleteTrack,
    onMutate: async (id) => {
      await queryClient.cancelQueries(["tracks"]);
      const previousData = queryClient.getQueryData(["tracks", page, limit, sort, order, filter, debouncedSearch]);
      queryClient.setQueryData(["tracks", page, limit, sort, order, filter, debouncedSearch], (old) => ({
        ...old,
        data: old.data.filter((track) => track.id !== id),
      }));
      return { previousData };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["tracks", page, limit, sort, order, filter, debouncedSearch], context.previousData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["tracks"]);
      setIsConfirmDialogOpen(false);
      setTrackToDelete(null);
    },
  });

  const handleDeleteClick = (track) => {
    setTrackToDelete(track);
    setIsConfirmDialogOpen(true);
  };

  const handleSortChange = (e) => {
    const [newSort, newOrder] = e.target.value.split(":");
    setSort(newSort);
    setOrder(newOrder);
  };

  const handlePlay = (trackId, audioElement) => {
    if (playingTrackId && playingTrackId !== trackId) {
      audioRef.current.pause();
    }
    setPlayingTrackId(trackId);
    audioRef.current = audioElement;
  };

  
  const defaultCoverImage = "https://picsum.photos/200/300?grayscale"; 

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 data-testid="tracks-header" className="text-3xl font-bold mb-6 text-gray-100">
        Tracks
      </h1>
      <div className="flex justify-between mb-6">
        <button
          data-testid="create-track-button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Create Track
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          data-testid="search-input"
          type="text"
          placeholder="Search by title, artist, album..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded w-full sm:w-1/3"
        />
        <select
          data-testid="sort-select"
          value={`${sort}:${order}`}
          onChange={handleSortChange}
          className="p-2 border rounded w-full sm:w-1/3"
        >
          <option value="title:asc">Sort by Title (Asc)</option>
          <option value="title:desc">Sort by Title (Desc)</option>
          <option value="artist:asc">Sort by Artist (Asc)</option>
          <option value="artist:desc">Sort by Artist (Desc)</option>
          <option value="album:asc">Sort by Album (Asc)</option>
          <option value="album:desc">Sort by Album (Desc)</option>
          <option value="createdAt:asc">Sort by Created At (Asc)</option>
          <option value="createdAt:desc">Sort by Created At (Desc)</option>
        </select>
        <input
          data-testid="filter-genre"
          type="text"
          placeholder="Filter by genre"
          value={filter.genre}
          onChange={(e) => setFilter({ ...filter, genre: e.target.value })}
          className="p-2 border rounded w-full sm:w-1/3"
        />
        <input
          data-testid="filter-artist"
          type="text"
          placeholder="Filter by artist"
          value={filter.artist}
          onChange={(e) => setFilter({ ...filter, artist: e.target.value })}
          className="p-2 border rounded w-full sm:w-1/3"
        />
      </div>

      {isLoading ? (
        <div data-testid="loading-tracks" className="text-center loader">
          Loading tracks...
        </div>
      ) : error ? (
        <div className="text-red-400 text-center">
          Error loading tracks: {error.message}
        </div>
      ) : !data || !data.data ? (
        <div className="text-center text-gray-400">No tracks available.</div>
      ) : (
        <div className="space-y-4">
          {data.data.map((track) => (
            <div
              key={track.id}
              data-testid={`track-item-${track.id}`}
              className="track-item flex flex-col sm:flex-row justify-between p-4 rounded-lg shadow"
            >
              <div className="flex items-center gap-4">
                <img
                  src={track.coverImage || defaultCoverImage} 
                  alt="Cover"
                  className="w-12 h-12 rounded"
                  onError={(e) => (e.target.src = defaultCoverImage)} 
                />
                <div>
                  <p data-testid={`track-item-${track.id}-title`} className="text-lg font-medium text-gray-400">
                    {track.title}
                  </p>
                  <p data-testid={`track-item-${track.id}-artist`} className="text-sm text-gray-400">
                    {track.artist}
                  </p>
                  {track.audioFile && audioUrls[track.id] ? (
                    <audio
                      data-testid={`audio-player-${track.id}`}
                      controls
                      src={audioUrls[track.id]}
                      className="mt-2"
                      onPlay={(e) => handlePlay(track.id, e.target)}
                      onError={(e) => console.error("Audio playback error:", e.nativeEvent)}
                    >
                      <source src={audioUrls[track.id]} type="audio/mpeg" />
                      <source src={audioUrls[track.id]} type="audio/wav" />
                      Your browser does not support the audio element.
                    </audio>
                  ) : track.audioFile ? (
                    <p className="text-gray-400">Loading audio...</p>
                  ) : (
                    <p className="text-gray-400">No audio file</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 sm:mt-0">
                <button
                  data-testid={`edit-track-${track.id}`}
                  onClick={() => {
                    setTrackToEdit(track);
                    setIsEditModalOpen(true);
                  }}
                  className="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
                >
                  Edit
                </button>
                <button
                  data-testid={`delete-track-${track.id}`}
                  onClick={() => handleDeleteClick(track)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  data-testid={`upload-track-${track.id}`}
                  onClick={() => {
                    setTrackToUpload(track);
                    setIsUploadModalOpen(true);
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Upload
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div data-testid="pagination" className="flex justify-between mt-6">
        <button
          data-testid="pagination-prev"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-500"
          aria-disabled={page === 1}
        >
          Previous
        </button>
        <button
          data-testid="pagination-next"
          onClick={() => setPage((p) => p + 1)}
          disabled={data?.meta?.page >= data?.meta?.totalPages}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-500"
          aria-disabled={data?.meta?.page >= data?.meta?.totalPages}
        >
          Next
        </button>
      </div>

      <TrackFormModal
        isOpen={isCreateModalOpen}
        onRequestClose={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries(["tracks"]);
        }}
      />
      <TrackFormModal
        isOpen={isEditModalOpen}
        onRequestClose={() => {
          setIsEditModalOpen(false);
          setTrackToEdit(null);
          queryClient.invalidateQueries(["tracks"]);
        }}
        trackToEdit={trackToEdit}
      />
      <UploadTrackModal
        isOpen={isUploadModalOpen}
        onRequestClose={() => {
          setIsUploadModalOpen(false);
          setTrackToUpload(null);
          queryClient.invalidateQueries(["tracks"]);
        }}
        track={trackToUpload}
      />

      {isConfirmDialogOpen && (
        <div
          data-testid="confirm-dialog"
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
        >
          <div className="modal-content p-6 rounded-lg shadow-lg max-w-sm w-full">
            <p className="text-gray-100 mb-4">
              Are you sure you want to delete "{trackToDelete?.title}"?
            </p>
            <div className="flex gap-2">
              <button
                data-testid="confirm-delete"
                onClick={() => deleteMutation.mutate(trackToDelete.id)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Yes
              </button>
              <button
                data-testid="cancel-delete"
                onClick={() => setIsConfirmDialogOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackList;