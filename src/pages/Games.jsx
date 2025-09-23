import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Game, ContentRelationship } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Play,
  Trash2,
  Plus,
  Edit
} from "lucide-react";
import { getGameTypeName, getGameTypeIcon, getDeviceCompatibilityText } from "@/config/gameTypes";
import { getProductTypeName } from "@/config/productTypes";

export default function Games() {
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState(null);
  const [games, setGames] = useState([]);

  const fetchAdminDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await User.me();
      setIsAdmin(user.role === 'admin');

      if (user.role === 'admin') {
        const gamesData = await Game.find({}, "-created_date");
        setGames(gamesData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת נתונים' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAdminDashboardData();
  }, [fetchAdminDashboardData]);


  const GamesTab = () => {
    const [localMessage, setLocalMessage] = useState(null);

    const showLocalMessage = (type, text) => {
      setLocalMessage({ type, text });
      setTimeout(() => setLocalMessage(null), 3000);
    };

    const handleNewGame = () => {
      navigate('/games/create');
    };

    const handleEditGame = (game) => {
      navigate(`/games/edit/${game.id}`);
    };


    const handleDeleteGame = async (gameId) => {
      if (!window.confirm(`האם אתה בטוח שברצונך למחוק ${getProductTypeName('game', 'singular')} זה?`)) return;
      try {
        console.log('🗑️ Deleting game and its relationships:', gameId);
        
        // First, delete all content relationships for this game
        const relationships = await ContentRelationship.filter({ 
          target_id: gameId, 
          target_type: 'Game' 
        });
        
        console.log(`🔗 Found ${relationships.length} relationships to delete`);
        
        for (const relationship of relationships) {
          await ContentRelationship.delete(relationship.id);
          console.log('❌ Deleted relationship:', relationship.id);
        }
        
        // Then delete the game itself
        await Game.delete(gameId);
        
        showLocalMessage('success', `ה${getProductTypeName('game', 'singular')} נמחק בהצלחה`);
        fetchAdminDashboardData();
      } catch (error) {
        console.error("Error deleting game:", error);
        showLocalMessage('error', `שגיאה במחיקת ה${getProductTypeName('game', 'singular')}`);
      }
    };


    return (
      <div className="space-y-6" dir="rtl">
        {localMessage && (
          <Alert variant={localMessage.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {localMessage.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{localMessage.text}</AlertDescription>
          </Alert>
        )}

        {/* Games Management Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl shadow-lg border-0 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Play className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">ניהול {getProductTypeName('game', 'plural')}</h2>
                <p className="text-purple-100 mt-1">נהל {getProductTypeName('game', 'plural')} דיגיטליים</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-semibold text-gray-900">ניהול {getProductTypeName('game', 'plural')}</h3>
          <Button
            onClick={handleNewGame}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
          >
            <Plus className="w-5 h-5 ml-2" />
            {getProductTypeName('game', 'singular')} חדש
          </Button>
        </div>

        <Card className="border-none shadow-xl bg-gradient-to-br from-white to-gray-50">
          <CardContent className="p-8">
            {games.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl mx-auto mb-6 flex items-center justify-center">
                  <Play className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-3">אין {getProductTypeName('game', 'plural')} כרגע</h3>
                <p className="text-gray-500 text-lg">התחל ביצירת ה{getProductTypeName('game', 'singular')} הראשון שלך</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {games.map(game => (
                  <div key={game.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-2xl">{getGameTypeIcon(game.game_type)}</span>
                          <h4 className="text-xl font-bold text-gray-900">{game.title}</h4>
                          {game.is_published && (
                            <Badge className="bg-green-100 text-green-800 px-3 py-1">פורסם</Badge>
                          )}
                          {game.price > 0 && (
                            <Badge variant="outline" className="px-3 py-1">₪{game.price}</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4 text-lg leading-relaxed">{game.short_description}</p>
                        <div className="flex flex-wrap gap-3">
                          <span className="bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium">
                            {getGameTypeName(game.game_type)}
                          </span>
                          {game.subject && (
                            <span className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">
                              מקצוע: {game.subject}
                            </span>
                          )}
                          <span className="bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium">
                            {getDeviceCompatibilityText(game.device_compatibility)}
                          </span>
                          {game.skills && game.skills.length > 0 && (
                            <span className="bg-orange-50 text-orange-700 px-3 py-2 rounded-lg text-sm font-medium">
                              מיומנויות: {game.skills.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 mr-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGame(game)}
                          className="h-12 w-12 p-0 rounded-xl hover:bg-blue-50 hover:border-blue-200"
                        >
                          <Edit className="w-5 h-5 text-blue-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGame(game.id)}
                          className="h-12 w-12 p-0 rounded-xl hover:bg-red-50 hover:border-red-200"
                        >
                          <Trash2 className="w-5 h-5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה למרכז הניהול. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <GamesTab />
        </div>
      </main>
    </div>
  );
}
