import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus, Folder, FolderOpen, Pencil, Trash2, Check, X, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MediaFolder {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  user_id: string;
}

interface FolderSidebarProps {
  folders: MediaFolder[];
  activeFolderId: string | null; // null = "All"
  onSelectFolder: (folderId: string | null) => void;
  onFoldersChange: () => void;
  userId: string;
}

export const FolderSidebar = ({
  folders,
  activeFolderId,
  onSelectFolder,
  onFoldersChange,
  userId,
}: FolderSidebarProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase
      .from("media_folders")
      .insert({ user_id: userId, name, sort_order: folders.length });
    if (error) {
      toast.error("Failed to create folder");
    } else {
      toast.success("Folder created");
      setNewName("");
      setIsCreating(false);
      onFoldersChange();
    }
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase
      .from("media_folders")
      .update({ name })
      .eq("id", id);
    if (error) {
      toast.error("Failed to rename folder");
    } else {
      toast.success("Folder renamed");
      setEditingId(null);
      onFoldersChange();
    }
  };

  const handleDelete = async (folder: MediaFolder) => {
    if (!confirm(`Delete folder "${folder.name}"? Videos inside will be moved to "All".`)) return;
    const { error } = await supabase
      .from("media_folders")
      .delete()
      .eq("id", folder.id);
    if (error) {
      toast.error("Failed to delete folder");
    } else {
      toast.success("Folder deleted");
      if (activeFolderId === folder.id) onSelectFolder(null);
      onFoldersChange();
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Folders</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => { setIsCreating(true); setNewName(""); }}
          title="New folder"
        >
          <FolderPlus className="w-4 h-4" />
        </Button>
      </div>

      {/* All items */}
      <button
        onClick={() => onSelectFolder(null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          activeFolderId === null
            ? "bg-accent/15 text-accent font-medium"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <LayoutGrid className="w-4 h-4 shrink-0" />
        All Media
      </button>

      {/* Folder list */}
      {folders.map((folder) => (
        <div key={folder.id} className="group relative">
          {editingId === folder.id ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(folder.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRename(folder.id)}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => onSelectFolder(folder.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeFolderId === folder.id
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {activeFolderId === folder.id ? (
                <FolderOpen className="w-4 h-4 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate flex-1 text-left">{folder.name}</span>
              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(folder.id);
                    setEditName(folder.name);
                  }}
                  className="p-1 rounded hover:bg-muted-foreground/10"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(folder);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </button>
          )}
        </div>
      ))}

      {/* Create new folder inline */}
      {isCreating && (
        <div className="flex items-center gap-1 px-2 py-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setIsCreating(false);
            }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCreate}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setIsCreating(false)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
