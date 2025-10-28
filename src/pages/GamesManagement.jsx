import React, { useState, useEffect } from "react";
import { getApiBase } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Gamepad2,
  Calendar,
  User,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Edit,
  Plus,
  Trash2,
  Package,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import GameModal from "@/components/modals/GameModal";
import ProductModal from "@/components/modals/ProductModal";
// DEBUG: Import new modal for comparison
import ProductModalV2 from '@/components/product/ProductModalV2';

const ITEMS_PER_PAGE = 20;

export default function GamesManagement() {
  const { currentUser } = useUser();
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Modal states
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // DEBUG: State for modal comparison - REMOVE IN PRODUCTION
  const [useOldModal, setUseOldModal] = useState(true); // Default to old modal for games

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [gameTypeFilter, setGameTypeFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [hasProductFilter, setHasProductFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentGames = filteredGames.slice(startIndex, endIndex);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortGames();
  }, [games, searchTerm, gameTypeFilter, deviceFilter, hasProductFilter, sortBy, sortOrder]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBase()}/games`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const gamesData = await response.json();
      clog('Games loaded:', gamesData);
      setGames(gamesData);
    } catch (error) {
      cerror("Error loading games:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת המשחקים' });
      toast({
        title: "שגיאה בטעינה",
        description: "לא ניתן לטעון את רשימת המשחקים",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const filterAndSortGames = () => {
    let filtered = [...games];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(game =>
        game.title?.toLowerCase().includes(searchLower) ||
        game.description?.toLowerCase().includes(searchLower) ||
        game.creator?.full_name?.toLowerCase().includes(searchLower)
      );
    }

    // Game type filter
    if (gameTypeFilter !== "all") {
      filtered = filtered.filter(game => game.game_type === gameTypeFilter);
    }

    // Device compatibility filter
    if (deviceFilter !== "all") {
      filtered = filtered.filter(game =>
        game.device_compatibility === deviceFilter ||
        game.device_compatibility === 'both'
      );
    }

    // Has product filter
    if (hasProductFilter !== "all") {
      if (hasProductFilter === "with_product") {
        filtered = filtered.filter(game => game.product !== null);
      } else if (hasProductFilter === "without_product") {
        filtered = filtered.filter(game => game.product === null);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredGames(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleDeleteGame = async (gameId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשחק? פעולה זו בלתי הפיכה.')) {
      return;
    }

    try {
      const response = await fetch(`${getApiBase()}/games/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setMessage({ type: 'success', text: 'המשחק נמחק בהצלחה' });
      toast({
        title: "משחק נמחק",
        description: "המשחק הוסר מהמערכת בהצלחה",
        variant: "default"
      });
      loadData(); // Reload data
    } catch (error) {
      cerror('Error deleting game:', error);
      setMessage({ type: 'error', text: 'שגיאה במחיקת המשחק' });
      toast({
        title: "שגיאה במחיקה",
        description: 'לא ניתן למחוק את המשחק',
        variant: "destructive"
      });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateGame = () => {
    setSelectedGame(null);
    setIsGameModalOpen(true);
  };

  const handleEditGame = (game) => {
    setSelectedGame(game);
    setIsGameModalOpen(true);
  };

  const handleCreateProduct = (game) => {
    setSelectedGame(game);
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (game) => {
    setSelectedGame(game);
    setSelectedProduct(game.product);
    setIsProductModalOpen(true);
  };

  const handleGameSaved = () => {
    setIsGameModalOpen(false);
    setSelectedGame(null);
    loadData();
  };

  const handleProductSaved = () => {
    setIsProductModalOpen(false);
    setSelectedGame(null);
    setSelectedProduct(null);
    loadData();
  };

  const getGameTypeBadge = (gameType) => {
    const types = {
      'scatter_game': { label: 'משחק פיזור', color: 'bg-blue-100 text-blue-800' },
      'wisdom_maze': { label: 'מבוך חכמה', color: 'bg-purple-100 text-purple-800' },
      'sharp_and_smooth': { label: 'חד וחלק', color: 'bg-green-100 text-green-800' },
      'memory_game': { label: 'משחק זיכרון', color: 'bg-orange-100 text-orange-800' },
      'ar_up_there': { label: 'AR למעלה', color: 'bg-pink-100 text-pink-800' }
    };

    const type = types[gameType] || { label: gameType || 'לא מוגדר', color: 'bg-gray-100 text-gray-800' };
    return <Badge className={type.color}>{type.label}</Badge>;
  };

  const getDeviceBadge = (device) => {
    const devices = {
      'mobile_only': { label: 'נייד בלבד', color: 'bg-cyan-100 text-cyan-800' },
      'desktop_only': { label: 'מחשב בלבד', color: 'bg-indigo-100 text-indigo-800' },
      'both': { label: 'כל המכשירים', color: 'bg-emerald-100 text-emerald-800' }
    };

    const deviceInfo = devices[device] || { label: device || 'לא מוגדר', color: 'bg-gray-100 text-gray-800' };
    return <Badge className={deviceInfo.color}>{deviceInfo.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען משחקים...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">ניהול משחקים</h1>
              <p className="text-gray-500">צור, ערוך וניהל את המשחקים שלך</p>
            </div>
            <div className="flex items-center gap-3">
              {/* DEBUG: Modal comparison toggle - REMOVE IN PRODUCTION */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={useOldModal}
                      onCheckedChange={setUseOldModal}
                      id="use-old-modal-games"
                    />
                    <label htmlFor="use-old-modal-games" className="text-sm font-medium text-red-700">
                      🐛 DEBUG: {useOldModal ? 'Modal ישן' : 'Modal חדש'}
                    </label>
                  </div>
                </div>
              )}

              <Button onClick={handleCreateGame} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                צור משחק חדש
              </Button>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Gamepad2 className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="חפש משחק..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              {/* Game Type Filter */}
              <Select value={gameTypeFilter} onValueChange={setGameTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סוג משחק" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="scatter_game">משחק פיזור</SelectItem>
                  <SelectItem value="wisdom_maze">מבוך חכמה</SelectItem>
                  <SelectItem value="sharp_and_smooth">חד וחלק</SelectItem>
                  <SelectItem value="memory_game">משחק זיכרון</SelectItem>
                  <SelectItem value="ar_up_there">AR למעלה</SelectItem>
                </SelectContent>
              </Select>

              {/* Device Filter */}
              <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="תמיכת מכשירים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המכשירים</SelectItem>
                  <SelectItem value="mobile_only">נייד בלבד</SelectItem>
                  <SelectItem value="desktop_only">מחשב בלבד</SelectItem>
                  <SelectItem value="both">כל המכשירים</SelectItem>
                </SelectContent>
              </Select>

              {/* Product Filter */}
              <Select value={hasProductFilter} onValueChange={setHasProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="מוצר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="with_product">עם מוצר</SelectItem>
                  <SelectItem value="without_product">ללא מוצר</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">תאריך יצירה</SelectItem>
                    <SelectItem value="title">שם</SelectItem>
                    <SelectItem value="game_type">סוג משחק</SelectItem>
                    <SelectItem value="updated_at">עדכון אחרון</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2"
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">סה"כ משחקים</p>
                  <p className="text-2xl font-bold text-gray-900">{games.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">עם מוצרים</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {games.filter(g => g.product !== null).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">שלי</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {games.filter(g => g.creator_user_id === currentUser?.uid).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">השבוע</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {games.filter(g => {
                      const gameDate = new Date(g.created_at);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return gameDate > weekAgo;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Games List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              רשימת משחקים ({filteredGames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentGames.length > 0 ? (
              <div className="space-y-4">
                {currentGames.map((game) => (
                  <div key={game.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {game.title || `משחק ${game.id}`}
                          </h3>
                          {getGameTypeBadge(game.game_type)}
                          {getDeviceBadge(game.device_compatibility)}
                          {game.product && (
                            <Badge className="bg-emerald-100 text-emerald-800">
                              <Package className="w-3 h-3 mr-1" />
                              יש מוצר
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>
                                {game.creator?.full_name || 'לא ידוע'}
                                {currentUser?.role === 'admin' && game.creator_user_id === currentUser?.uid && ' (אני)'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                נוצר: {format(new Date(game.created_at), 'dd/MM/yyyy', { locale: he })}
                              </span>
                            </div>
                          </div>

                          {game.product && (
                            <div>
                              <div className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                <span>
                                  מחיר: ₪{game.product.price || 0}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {game.description && (
                          <p className="mt-2 text-gray-600 text-sm">{game.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {game.product ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(game)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="ערוך מוצר"
                          >
                            <Package className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateProduct(game)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="צור מוצר"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGame(game)}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="ערוך משחק"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGame(game.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="מחק משחק"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      מציג {startIndex + 1} - {Math.min(endIndex, filteredGames.length)} מתוך {filteredGames.length} משחקים
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronRight className="w-4 h-4" />
                        הקודם
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        הבא
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gamepad2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">אין משחקים</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || gameTypeFilter !== "all" || deviceFilter !== "all" || hasProductFilter !== "all"
                    ? "לא נמצאו משחקים התואמים את הפילטרים"
                    : "עדיין לא נוצרו משחקים במערכת"
                  }
                </p>
                <Button onClick={handleCreateGame}>
                  <Plus className="w-4 h-4 mr-2" />
                  צור משחק ראשון
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <GameModal
          isOpen={isGameModalOpen}
          onClose={() => setIsGameModalOpen(false)}
          game={selectedGame}
          onSaved={handleGameSaved}
        />

        {/* DEBUG: Conditional modal rendering - REMOVE IN PRODUCTION */}
        {useOldModal ? (
          <ProductModal
            isOpen={isProductModalOpen}
            onClose={() => setIsProductModalOpen(false)}
            product={selectedProduct}
            entityType="game"
            entityId={selectedGame?.id}
            onSaved={handleProductSaved}
          />
        ) : (
          <ProductModalV2
            isOpen={isProductModalOpen}
            onClose={() => setIsProductModalOpen(false)}
            editingProduct={selectedProduct}
            onSave={handleProductSaved}
            currentUser={currentUser}
            canCreateProductType={() => true}
            isContentCreatorMode={false}
          />
        )}
      </div>
    </div>
  );
}