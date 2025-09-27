import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Game, User, Settings } from "@/services/entities"; // Assuming Purchase is also exposed via entities/all or will be dynamically imported
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Play, Users, Clock, Award, Filter, Sparkles, Gamepad2, Eye, EyeOff, TrendingUp, Calendar, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { getCurrentMonthAnalytics, getAllTimeAnalytics } from "@/components/utils/getUserGameAnalytics";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";

const GAME_TYPE_NAMES = {
  'sharp_and_smooth': 'חד וחלק',
  'elevator_game': `${getProductTypeName('game', 'singular')} המעלית`,
  'memory_game': `${getProductTypeName('game', 'singular')} זיכרון`,
  'scatter_game': 'תפזורת'
};

const GAME_TYPE_ICONS = {
  'sharp_and_smooth': '✏️',
  'elevator_game': '🏢',
  'memory_game': '🧠',
  'scatter_game': '🎯'
};

export default function GamesCatalog() {
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gameTypeFilter, setGameTypeFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState(null); // New state for displaying messages (e.g., errors)

  // User analytics
  const [userAnalytics, setUserAnalytics] = useState({
    allTime: { uniqueGames: 0, totalSessions: 0 },
    currentMonth: { uniqueGames: 0, totalSessions: 0 }
  });

  const loadUserAnalytics = useCallback(async (userId) => {
    console.log('🔍 Loading user analytics for userId:', userId);
    
    try {
      const [allTimeData, currentMonthData] = await Promise.all([
        getAllTimeAnalytics(userId),
        getCurrentMonthAnalytics(userId)
      ]);

      console.log('🔍 All time data:', allTimeData);
      console.log('🔍 Current month data:', currentMonthData);

      setUserAnalytics({
        allTime: allTimeData,
        currentMonth: currentMonthData
      });
    } catch (error) {
      console.error("Error loading user analytics:", error);
    }
  }, []); // Empty dependency array as it doesn't depend on any state/props

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null); // Clear any previous messages
    let user = null; // Declare user here to be accessible throughout
    let gamesData = []; // Declare gamesData here
    let usersData = []; // Declare usersData here
    let appSettings = []; // Declare appSettings here

    try {
      // 1. Load current user and admin status
      try {
        user = await User.me();
        setCurrentUser(user);
        setIsAdmin(user?.role === 'admin');
        
        // Load user analytics if user is logged in
        if (user?.id) {
          loadUserAnalytics(user.id);
        }
      } catch (error) {
        // User not logged in or error getting user, proceed as guest
        setCurrentUser(null);
        setIsAdmin(false);
        console.warn("Could not load current user:", error);
      }

      // 2. Load all users for display names (needed before games processing)
      try {
        usersData = await User.find();
        setUsers(usersData);
      } catch (error) {
        console.error("Error loading users for display names:", error);
        usersData = []; // Ensure it's an empty array on error
      }

      // 3. Load settings (for logo etc.)
      try {
        appSettings = await Settings.find();
        if (appSettings.length > 0) {
          setSettings(appSettings[0]);
        } else {
          setSettings(null); // Fallback if no settings are found
        }
      } catch (e) {
        console.warn("Error loading application settings:", e);
        setSettings(null);
      }
      
      // 4. Load games based on user status and purchases
      if (user) {
        // User is logged in, check for purchases and admin status
        try {
          // Dynamically import Purchase entity
          const { Purchase } = await import('@/services/entities'); 
          const userPurchases = await Purchase.filter({ 
            buyer_user_id: user.id, 
            payment_status: 'paid' 
          });
          const purchasedGameIds = userPurchases.map(p => p.product_id);
          
          // Load all games
          const allGames = await Game.find({}, '-created_date');

          // Filter games: show if published, OR if purchased by the current user, OR if user is an "admin"
          gamesData = allGames.filter(game => 
            game.is_published || purchasedGameIds.includes(game.id) || (user.role === 'admin')
          );
        } catch (purchaseOrAllGamesError) {
          console.warn("Error loading user purchases or all games for logged-in user, falling back:", purchaseOrAllGamesError);
          // Fallback if purchase/all games loading fails for logged-in user
          // Revert to showing only published games for non-admins, and all for admins
          if (user.role === 'admin') {
            gamesData = await Game.find({}, '-created_date');
          } else {
            gamesData = await Game.filter({ is_published: true }, '-created_date');
          }
        }
      } else {
        // Not logged in - only show published games
        gamesData = await Game.filter({ is_published: true }, '-created_date');
      }

      // 5. Add creator display names to games
      const gamesWithCreators = gamesData.map(game => {
        const creator = usersData.find(u => u.email === game.created_by);
        return {
          ...game,
          created_by_display_name: creator?.display_name || creator?.full_name
        };
      });
      
      setGames(gamesWithCreators);
      setFilteredGames(gamesWithCreators); // Ensure filteredGames is also initialized
      
    } catch (globalError) {
      console.error("Critical error in loadData:", globalError);
      setGames([]);
      setFilteredGames([]);
      setMessage({ type: 'error', text: 'שגיאה קריטית בטעינת הנתונים.' });
    }
    setLoading(false);
  }, [loadUserAnalytics]); // `loadUserAnalytics` is a dependency as it's called inside `loadData`

  useEffect(() => {
    loadData();
  }, [loadData]); // `loadData` is a dependency as it's called inside this effect

  // Filter games based on search and filters
  useEffect(() => {
    let filtered = games;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(game => 
        game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.short_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(game => game.subject === subjectFilter);
    }

    // Game type filter
    if (gameTypeFilter !== 'all') {
      filtered = filtered.filter(game => game.game_type === gameTypeFilter);
    }

    // Price filter
    if (priceFilter !== 'all') {
      if (priceFilter === 'free') {
        filtered = filtered.filter(game => game.price === 0);
      } else if (priceFilter === 'paid') {
        filtered = filtered.filter(game => game.price > 0);
      }
    }

    setFilteredGames(filtered);
  }, [games, searchTerm, subjectFilter, gameTypeFilter, priceFilter]);

  // Get unique subjects from games
  const subjects = [...new Set(games.map(game => game.subject).filter(Boolean))];

  // Get device compatibility display text (kept for completeness, though not used in new card UI)
  const getDeviceCompatibilityText = (compatibility) => {
    switch (compatibility) {
      case 'mobile_only':
        return 'מובייל בלבד';
      case 'desktop_only':
        return 'דסקטופ בלבד';
      case 'both':
        return 'כל המכשירים';
      default:
        return 'כל המכשירים';
    }
  };

  // Get age range display (kept for completeness, though not used in new card UI)
  const getAgeRangeDisplay = (ageRange) => {
    if (!ageRange) return null;
    
    let range;
    if (typeof ageRange === 'string') {
      try {
        range = JSON.parse(ageRange);
      } catch (e) {
        return null;
      }
    } else {
      range = ageRange;
    }

    if (range.min && range.max) {
      return `${range.min}-${range.max}`;
    } else if (range.min) {
      return `${range.min}+`;
    } else if (range.max) {
      return `עד ${range.max}`;
    }
    return null;
  };

  // Get grade range display (kept for completeness, though not used in new card UI)
  const getGradeRangeDisplay = (gradeRange) => {
    if (!gradeRange) return null;
    
    let range;
    if (typeof gradeRange === 'string') {
      try {
        range = JSON.parse(gradeRange);
      } catch (e) {
        return null;
      }
    } else {
      range = gradeRange;
    }

    const gradeLabels = {
      'kindergarten': 'גן',
      '1': "א'", '2': "ב'", '3': "ג'", 
      '4': "ד'", '5': "ה'", '6': "ו'",
      '7': "ז'", '8': "ח'", '9': "ט'",
      '10': "י'", '11': "יא'", '12': "יב'"
    };

    if (range.min && range.max) {
      const minLabel = gradeLabels[range.min] || range.min;
      const maxLabel = gradeLabels[range.max] || range.max;
      if (range.min === range.max) {
        return minLabel;
      }
      return `${minLabel}-${maxLabel}`;
    } else if (range.min) {
      return `מ${gradeLabels[range.min] || range.min}`;
    } else if (range.max) {
      return `עד ${gradeLabels[range.max] || range.max}`;
    }
    return null;
  };

  // Helper function for price badge color (new)
  const getPriceColor = (price) => {
    return price > 0 ? "bg-blue-500 text-white" : "bg-green-500 text-white";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-4" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
            <p className="text-xl text-gray-600">טוען {getProductTypeName('game', 'plural')}...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50" dir="rtl">
      {/* Compact Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-br from-yellow-400/20 to-pink-500/20 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-right">
              <h1 className="text-2xl md:text-4xl font-bold mb-2 leading-tight">
                <span className="bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  קטלוג ה{getProductTypeName('game', 'plural')}
                </span>
              </h1>
              <p className="text-base md:text-lg text-purple-100 max-w-2xl">
                {getProductTypeName('game', 'plural')} חינוכיים אינטראקטיביים לכל הגילאים
              </p>
            </div>

            {/* User Gaming Stats - Compact table for logged-in users */}
            {currentUser && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 border border-white/20">
                <h4 className="text-sm font-semibold text-center mb-2 text-yellow-300">הסטטיסטיקות שלי</h4>
                <table className="w-full text-xs text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-right py-1 px-2 text-purple-200"></th>
                      <th className="text-center py-1 px-2 text-purple-200">סה״כ</th>
                      <th className="text-center py-1 px-2 text-purple-200">חודש</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-right py-1 px-2 font-medium">{getProductTypeName('game', 'plural')}</td>
                      <td className="text-center py-1 px-2 font-bold text-yellow-300">
                        {userAnalytics.allTime.uniqueGames}
                      </td>
                      <td className="text-center py-1 px-2 font-bold text-cyan-300">
                        {userAnalytics.currentMonth.uniqueGames}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-right py-1 px-2 font-medium">סשנים</td>
                      <td className="text-center py-1 px-2 font-bold text-yellow-300">
                        {userAnalytics.allTime.totalSessions}
                      </td>
                      <td className="text-center py-1 px-2 font-bold text-cyan-300">
                        {userAnalytics.currentMonth.totalSessions}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Filters Section */}
        <Card className="mb-6 border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative xl:col-span-2">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={`חפש ${getProductTypeName('game', 'plural')}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 h-9 text-sm"
                />
              </div>

              {/* Subject Filter */}
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="כל המקצועות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המקצועות</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Game Type Filter */}
              <Select value={gameTypeFilter} onValueChange={setGameTypeFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={`כל סוגי ה${getProductTypeName('game', 'plural')}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל סוגי ה{getProductTypeName('game', 'plural')}</SelectItem>
                  {Object.entries(GAME_TYPE_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {GAME_TYPE_ICONS[key]} {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Results Count & Price Filter in same row */}
              <div className="flex gap-2 items-center">
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="h-9 text-sm flex-1">
                    <SelectValue placeholder="מחיר" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="free">חינם</SelectItem>
                    <SelectItem value="paid">בתשלום</SelectItem>
                  </SelectContent>
                </Select>
                
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs px-2 py-1">
                  {filteredGames.length}
                  {isAdmin && games.filter(g => !g.is_published).length > 0 && (
                    <span className="mr-1 text-orange-600">
                      ({games.filter(g => !g.is_published).length} לא פורסמו)
                    </span>
                  )}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message display (e.g., error messages) */}
        {message && (
          <div className={`p-4 mb-4 rounded-md text-center ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {message.text}
          </div>
        )}

        {/* Games Grid */}
        {filteredGames.length === 0 && !loading ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Gamepad2 className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">לא נמצאו {getProductTypeName('game', 'plural')}</h3>
            <p className="text-gray-500 mb-4">נסה לשנות את הפילטרים או חפש {getProductTypeName('game', 'plural')} אחרים</p>
            <Button onClick={() => {
              setSearchTerm('');
              setSubjectFilter('all');
              setGameTypeFilter('all');
              setPriceFilter('all');
            }} className="bg-purple-600 hover:bg-purple-700">
              נקה פילטרים
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredGames.map((game, index) => {
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 bg-white/80 backdrop-blur-sm rounded-2xl h-full">
                    
                    <div className="relative">
                      <img 
                        src={game.image_url || `https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=300&fit=crop`}
                        alt={game.title}
                        className="w-full h-44 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      
                      {/* Creator Attribution */}
                      <div className="absolute top-2 left-2">
                        {game.created_via === 'content_creator' ? (
                          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-gray-700 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {game.created_by_display_name || game.created_by?.split('@')[0] || 'יוצר תוכן'}
                          </div>
                        ) : (
                          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center">
                            {settings?.logo_url ? (
                              <img 
                                src={settings.logo_url} 
                                alt="Ludora" 
                                className="h-4 object-contain"
                              />
                            ) : (
                              <span className="text-xs font-bold text-purple-600">לודורה</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Unpublished badge for admins */}
                      {!game.is_published && isAdmin && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-500 text-white shadow-lg text-xs px-2 py-1">
                            לא פורסם
                          </Badge>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      
                      <div className="absolute bottom-3 right-3">
                        <Badge className={`text-xs font-bold shadow-lg ${getPriceColor(game.price)}`}>
                          {game.price > 0 ? `₪${game.price}` : 'חינם'}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-3 flex-1 flex flex-col">
                      <CardTitle className="text-sm font-bold mb-2 group-hover:text-purple-600 transition-colors line-clamp-1">
                        {game.title}
                      </CardTitle>
                      
                      <p className="text-gray-600 mb-3 text-xs leading-relaxed line-clamp-2 flex-1">
                        {game.short_description}
                      </p>

                      {/* Skills */}
                      {game.skills && game.skills.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {(typeof game.skills === 'string' ? JSON.parse(game.skills) : game.skills)
                              .slice(0, 1)
                              .map((skill, skillIndex) => (
                                <Badge key={skillIndex} variant="outline" className="text-xs font-medium border-purple-200 text-purple-700 px-1 py-0">
                                  {skill}
                                </Badge>
                              ))
                            }
                            {(typeof game.skills === 'string' ? JSON.parse(game.skills) : game.skills).length > 1 && (
                              <Badge variant="outline" className="text-xs font-medium border-purple-200 text-purple-700 px-1 py-0">
                                +{(typeof game.skills === 'string' ? JSON.parse(game.skills) : game.skills).length - 1}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Play Button */}
                      <Link to={`/launcher?id=${game.id}`} className="mt-auto">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md text-sm py-2 font-semibold rounded-lg transition-all duration-300 hover:shadow-lg">
                          <Play className="w-4 h-4 ml-1" />
                          שחק עכשיו
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
