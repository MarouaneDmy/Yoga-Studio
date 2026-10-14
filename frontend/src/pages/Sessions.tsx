import { Link } from "react-router-dom";
import api from "../services/api";
import { authService } from "../services/auth.service";
import { Session } from "../types";
import { useFetch } from "../hooks/useFetch";

function Sessions() {
  const user = authService.getCurrentUser();

  const {
    data: sessions,
    loading,
    error,
    refetch,
  } = useFetch<Session[]>({
    url: "/session",
    dependencies: [],
  });

  const handleDelete = async (sessionId: number): Promise<void> => {
    if (!window.confirm("Are you sure you want to delete this session?")) {
      return;
    }

    try {
      const token = authService.getToken();
      await api.delete(`/session/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      refetch(); // ✅ Recharge les données proprement
    } catch (err: unknown) {
      alert("Failed to delete session");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Yoga Sessions</h1>

          {/* ✅ 5. Court-circuit (&&) au lieu de ternaire avec null */}
          {user?.admin && (
            <Link
              to="/sessions/create"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Create Session
            </Link>
          )}
        </div>

        {!sessions || sessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No sessions available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-md p-6 flex flex-col"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {session.name}
                </h3>
                <p className="text-gray-600 mb-2">
                  Date: {new Date(session.date).toLocaleDateString()}
                </p>
                <p className="text-gray-600 mb-2">
                  Teacher: {session.teacher.firstName}{" "}
                  {session.teacher.lastName}
                </p>
                <p className="text-gray-600 mb-4">
                  Participants: {session.users.length}
                </p>

                <p className="text-gray-700 mb-4 line-clamp-3 flex-grow">
                  {session.description}
                </p>

                <div className="flex space-x-2 mt-auto">
                  <Link
                    to={`/sessions/${session.id}`}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded text-center hover:bg-indigo-700"
                  >
                    View Details
                  </Link>

                  {user?.admin && (
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Sessions;
