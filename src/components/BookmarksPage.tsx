import { useState } from "react";
import { Heart, FolderPlus, Music2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Folder {
  id: string;
  name: string;
  songCount: number;
  color: string;
}

const BookmarksPage = () => {
  const [folders, setFolders] = useState<Folder[]>([
    { id: "1", name: "Rock Classics", songCount: 3, color: "from-red-500 to-pink-500" },
    { id: "2", name: "Feel Good", songCount: 5, color: "from-yellow-500 to-orange-500" },
    { id: "3", name: "Workout", songCount: 2, color: "from-green-500 to-emerald-500" },
  ]);
  
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const colors = [
    "from-purple-500 to-blue-500",
    "from-pink-500 to-rose-500", 
    "from-cyan-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-green-500 to-lime-500",
    "from-indigo-500 to-purple-500"
  ];

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      songCount: 0,
      color: randomColor
    };
    
    setFolders([...folders, newFolder]);
    setNewFolderName("");
    setIsCreating(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders(folders.filter(folder => folder.id !== folderId));
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-mobile-hero mb-2">
          Your <span className="bg-gradient-primary bg-clip-text text-transparent">Collection</span>
        </h2>
        <p className="text-muted-foreground">
          Organize your favorite lyrics in custom folders
        </p>
      </div>

      {/* Quick Access - Liked Songs */}
      <Card className="glass border-border/50 hover:border-primary/30 transition-smooth">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-accent rounded-lg">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <div>
                <h3 className="font-semibold">Liked Songs</h3>
                <p className="text-sm text-muted-foreground">8 songs</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-primary">
              View All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Folders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-mobile-title">Your Folders</h3>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary hover:bg-gradient-accent transition-smooth">
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90%] glass border-border/50">
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Enter folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-card/50 border-border/50"
                />
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="bg-gradient-primary hover:bg-gradient-accent"
                  >
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Folders Grid */}
        <div className="grid grid-cols-2 gap-3">
          {folders.map((folder) => (
            <Card key={folder.id} className="glass border-border/50 hover:border-primary/30 transition-smooth group">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between">
                  <div className={`p-2 bg-gradient-to-br ${folder.color} rounded-lg shadow-sm`}>
                    <Music2 className="w-4 h-4 text-white" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFolder(folder.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 h-auto w-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <h4 className="font-semibold text-sm mb-1 truncate">{folder.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {folder.songCount} {folder.songCount === 1 ? 'song' : 'songs'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {folders.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-flex p-4 bg-muted/30 rounded-2xl mb-4">
              <FolderPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No folders yet</h3>  
            <p className="text-muted-foreground mb-4">
              Create your first folder to organize your favorite lyrics
            </p>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-gradient-primary hover:bg-gradient-accent"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarksPage;