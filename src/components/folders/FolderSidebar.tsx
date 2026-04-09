import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus, Folder, FolderOpen, Pencil, Trash2, Check, X, LayoutGrid, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MediaFolder {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  user_id: string;
  parent_folder_id: string | null;
}

interface FolderSidebarProps {
  folders: MediaFolder[];
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onFoldersChange: () => void;
  userId: string;
  onDropVideo?: (videoId: string, folderId: string | null) => void;
}

// Build a tree structure from flat folder list
function buildTree(folders: MediaFolder[]): Map<string | null, MediaFolder[]> {
  const map = new Map<string | null, MediaFolder[]>();
  for (const f of folders) {
    const parentId = f.parent_folder_id ?? null;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId)!.push(f);
  }
  return map;
}

function getDescendantIds(folderId: string, tree: Map<string | null, MediaFolder[]>): string[] {
  const ids: string[] = [];
  const children = tree.get(folderId) || [];
  for (const child of children) {
    ids.push(child.id);
    ids.push(...getDescendantIds(child.id, tree));
  }
  return ids;
}

export { getDescendantIds, buildTree };

export const FolderSidebar = ({
  folders,
  activeFolderId,
  onSelectFolder,
  onFoldersChange,
  userId,
  onDropVideo,
}: FolderSidebarProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dragOverId, setDragOverId] = useState<string | "all" | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);

  const tree = buildTree(folders);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent, id: string | "all") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverId(null);
    const videoId = e.dataTransfer.getData("text/video-id");
    if (videoId && onDropVideo) {
      onDropVideo(videoId, folderId);
    }
  };

  const handleCreate = async (parentId: string | null) => {
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase
      .from("media_folders")
      .insert({
        user_id: userId,
        name,
        sort_order: folders.length,
        parent_folder_id: parentId,
      } as any);
    if (error) {
      toast.error("Failed to create folder");
    } else {
      toast.success("Folder created");
      setNewName("");
      setIsCreating(false);
      setCreatingParentId(null);
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
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
    const childCount = getDescendantIds(folder.id, tree).length;
    const msg = childCount > 0
      ? `Delete folder "${folder.name}" and its ${childCount} subfolder(s)? Videos inside will be moved to "All".`
      : `Delete folder "${folder.name}"? Videos inside will be moved to "All".`;
    if (!confirm(msg)) return;
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

  const startCreateSubfolder = (parentId: string | null) => {
    setIsCreating(true);
    setCreatingParentId(parentId);
    setNewName("");
  };

  const renderFolder = (folder: MediaFolder, depth: number) => {
    const children = tree.get(folder.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(folder.id);
    const paddingLeft = 12 + depth * 16;

    return (
      <div key={folder.id}>
        {editingId === folder.id ? (
          <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft }}>
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
          <div className="group relative">
            <button
              onClick={() => onSelectFolder(folder.id)}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder.id)}
              className={`w-full flex items-center gap-1.5 py-2 rounded-lg text-sm transition-colors ${
                dragOverId === folder.id
                  ? "bg-accent/25 ring-2 ring-accent/50"
                  : activeFolderId === folder.id
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-muted-foreground hover:bg-muted"
              }`}
              style={{ paddingLeft, paddingRight: 12 }}
            >
              {/* Expand/collapse chevron */}
              {hasChildren ? (
                <span
                  className="shrink-0 p-0.5 rounded hover:bg-muted-foreground/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(folder.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
              ) : (
                <span className="w-4 shrink-0" />
              )}

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
                    startCreateSubfolder(folder.id);
                  }}
                  className="p-1 rounded hover:bg-muted-foreground/10"
                  title="New subfolder"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
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
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}

        {/* Inline create for subfolder */}
        {isCreating && creatingParentId === folder.id && (
          <div className="flex items-center gap-1 py-1" style={{ paddingLeft: paddingLeft + 16 }}>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Subfolder name"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate(folder.id);
                if (e.key === "Escape") { setIsCreating(false); setCreatingParentId(null); }
              }}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCreate(folder.id)}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setIsCreating(false); setCreatingParentId(null); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const rootFolders = tree.get(null) || [];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Folders</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => startCreateSubfolder(null)}
          title="New folder"
        >
          <FolderPlus className="w-4 h-4" />
        </Button>
      </div>

      {/* All items */}
      <button
        onClick={() => onSelectFolder(null)}
        onDragOver={(e) => handleDragOver(e, "all")}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          dragOverId === "all"
            ? "bg-accent/25 ring-2 ring-accent/50"
            : activeFolderId === null
              ? "bg-accent/15 text-accent font-medium"
              : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <LayoutGrid className="w-4 h-4 shrink-0" />
        All Media
      </button>

      {/* Folder tree */}
      {rootFolders.map((folder) => renderFolder(folder, 0))}

      {/* Create new root folder inline */}
      {isCreating && creatingParentId === null && (
        <div className="flex items-center gap-1 px-2 py-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate(null);
              if (e.key === "Escape") { setIsCreating(false); setCreatingParentId(null); }
            }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCreate(null)}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setIsCreating(false); setCreatingParentId(null); }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
