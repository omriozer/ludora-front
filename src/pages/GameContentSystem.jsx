import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Layers, Settings, Gamepad2, ArrowLeft, CheckCircle, AlertTriangle
} from 'lucide-react';
import GameContentTemplates from '@/components/GameContentTemplates';
import GameContentUsage from '@/components/GameContentUsage';
import { Game } from '@/services/entities';

export default function GameContentSystem() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUsage, setSelectedUsage] = useState(null);

  useEffect(() => {
    if (gameId) {
      loadGame();
    }
  }, [gameId]);

  const loadGame = async () => {
    setIsLoading(true);
    try {
      const gameData = await Game.findById(gameId);
      setGame(gameData);
    } catch (err) {
      setError('Failed to load game: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsageSelect = (usage) => {
    setSelectedUsage(usage);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading game content system...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate(gameId ? `/games/${gameId}` : '/admin/games')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Game Content System</h1>
          <p className="text-muted-foreground">
            {game ? `Managing content for "${game.title}"` : 'Manage content templates and usage patterns'}
          </p>
        </div>
      </div>

      {/* Game Info */}
      {game && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="font-semibold text-lg">{game.title}</h2>
                  {game.short_description && (
                    <p className="text-muted-foreground">{game.short_description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    <Gamepad2 className="w-3 h-3 mr-1" />
                    {game.game_type?.replace('_', ' ').toUpperCase()}
                  </Badge>
                  {game.is_published && (
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Published
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue={gameId ? "usage" : "templates"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Content Templates
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2" disabled={!gameId}>
            <Settings className="w-4 h-4" />
            Game Usage
            {!gameId && ' (Select a game first)'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <GameContentTemplates />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          {gameId ? (
            <GameContentUsage
              gameId={gameId}
              gameType={game?.game_type}
              onUsageSelect={handleUsageSelect}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Select a game to manage its content usage
                </p>
                <Button className="mt-4" onClick={() => navigate('/admin/games')}>
                  Browse Games
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Usage Detail Panel */}
      {selectedUsage && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Content Usage Details: {selectedUsage.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedUsage.description && (
                <p className="text-muted-foreground">{selectedUsage.description}</p>
              )}

              <div>
                <h4 className="font-medium mb-2">Content Types</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUsage.content_types?.map(type => (
                    <Badge key={type} variant="outline">{type}</Badge>
                  ))}
                </div>
              </div>

              {selectedUsage.rules && selectedUsage.rules.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Rules ({selectedUsage.rules.length})</h4>
                  <div className="space-y-2">
                    {selectedUsage.rules.map((rule, index) => (
                      <div key={index} className="bg-muted p-3 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{rule.rule_type}</span>
                          <Badge variant="secondary">Priority: {rule.priority}</Badge>
                        </div>
                        <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {JSON.stringify(rule.rule_config, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedUsage(null)}
                >
                  Close Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}