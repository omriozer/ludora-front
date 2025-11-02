import React, { useState, useEffect } from 'react';
import { AudioFile } from '@/services/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Edit, Trash2, Plus, Music, Loader2 } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

export default function AudioLibrary({ showMessage }) {
  const [audioFiles, setAudioFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    volume: 1,
    file: null
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadAudioFiles();
  }, []);

  const loadAudioFiles = async () => {
    setIsLoading(true);
    try {
      const files = await AudioFile.list('-created_date');
      setAudioFiles(files);
    } catch (error) {
      console.error('Error loading audio files:', error);
      showMessage('error', 'שגיאה בטעינת קבצי האודיו');
    }
    setIsLoading(false);
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name.trim()) {
      showMessage('error', 'נא למלא את כל השדות הנדרשים');
      return;
    }

    setIsUploading(true);
    try {
      const { UploadFile } = await import('@/services/integrations');
      const result = await UploadFile({ file: uploadForm.file });

      if (result && result.file_url) {
        // Get audio duration
        const audio = new Audio(result.file_url);
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', resolve);
        });

        await AudioFile.create({
          name: uploadForm.name.trim(),
          file_url: result.file_url,
          duration: audio.duration,
          volume: uploadForm.volume,
          file_size: uploadForm.file.size,
          file_type: uploadForm.file.type,
          is_default_for: []
        });

        showMessage('success', 'קובץ האודיו הועלה בהצלחה');
        setShowUploadForm(false);
        setUploadForm({ name: '', volume: 1, file: null });
        loadAudioFiles();
      }
    } catch (error) {
      console.error('Error uploading audio file:', error);

      // Clear the file input on error so user can try again
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.value = '';
      }
      setUploadForm(prev => ({ ...prev, file: null }));

      showMessage('error', 'שגיאה בהעלאת קובץ האודיו');
    }
    setIsUploading(false);
  };

  const handleEdit = async () => {
    if (!editingFile || !editingFile.name.trim()) return;

    try {
      await AudioFile.update(editingFile.id, {
        name: editingFile.name.trim(),
        volume: editingFile.volume
      });
      showMessage('success', 'קובץ האודיו עודכן בהצלחה');
      setEditingFile(null);
      loadAudioFiles();
    } catch (error) {
      console.error('Error updating audio file:', error);
      showMessage('error', 'שגיאה בעדכון קובץ האודיו');
    }
  };

  const handleDelete = async (fileId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) return;

    try {
      await AudioFile.delete(fileId);
      showMessage('success', 'קובץ האודיו נמחק בהצלחה');
      loadAudioFiles();
    } catch (error) {
      console.error('Error deleting audio file:', error);
      showMessage('error', 'שגיאה במחיקת קובץ האודיו');
    }
  };

  const filteredFiles = audioFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="mr-2 text-gray-600">טוען ספריית אודיו...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">ספריית אודיו</h3>
        <Button onClick={() => setShowUploadForm(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 ml-2" />
          העלה קובץ חדש
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="חפש קבצי אודיו..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>העלאת קובץ אודיו חדש</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file-input">קובץ אודיו</Label>
              <Input
                id="file-input"
                type="file"
                accept="audio/*"
                onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files[0] }))}
              />
            </div>
            <div>
              <Label htmlFor="name-input">שם הקובץ</Label>
              <Input
                id="name-input"
                value={uploadForm.name}
                onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="שם הקובץ..."
              />
            </div>
            <div>
              <Label htmlFor="volume-input">עוצמת צליל (0-1)</Label>
              <Input
                id="volume-input"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={uploadForm.volume}
                onChange={(e) => setUploadForm(prev => ({ ...prev, volume: parseFloat(e.target.value) || 1 }))}
              />
            </div>
            {/* Preview Audio */}
            {uploadForm.file && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label>תצוגה מקדימה:</Label>
                <AudioPlayer
                  src={URL.createObjectURL(uploadForm.file)}
                  volume={uploadForm.volume}
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={isUploading || !uploadForm.file || !uploadForm.name.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעלה...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 ml-2" />
                    העלה
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowUploadForm(false)}>
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio Files List */}
      <div className="space-y-4">
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Music className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {searchTerm ? 'לא נמצאו קבצים' : 'אין קבצי אודיו'}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'נסה לחפש עם מילות מפתח אחרות' : 'התחל בהעלאת קובץ האודיו הראשון'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFiles.map(file => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Music className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold">{file.name}</h4>
                      {file.is_default_for && file.is_default_for.length > 0 && (
                        <div className="flex gap-1">
                          {file.is_default_for.map(usage => (
                            <Badge key={usage} variant="secondary" className="text-xs">
                              {usage}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <AudioPlayer
                      src={file.file_url}
                      volume={file.volume}
                      className="mb-2"
                    />
                    <div className="text-sm text-gray-500">
                      עוצמה: {Math.round(file.volume * 100)}% | 
                      משך: {Math.round(file.duration)}s |
                      גודל: {Math.round(file.file_size / 1024)}KB
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingFile({ ...file })}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>עריכת קובץ אודיו</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>שם הקובץ</Label>
                <Input
                  value={editingFile.name}
                  onChange={(e) => setEditingFile(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>עוצמת צליל (0-1)</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editingFile.volume}
                  onChange={(e) => setEditingFile(prev => ({ ...prev, volume: parseFloat(e.target.value) || 1 }))}
                />
              </div>
              <AudioPlayer
                src={editingFile.file_url}
                volume={editingFile.volume}
              />
              <div className="flex gap-3">
                <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
                  שמור שינויים
                </Button>
                <Button variant="outline" onClick={() => setEditingFile(null)}>
                  ביטול
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}