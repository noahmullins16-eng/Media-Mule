import { Play, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  duration: string;
  creator: string;
}

export const VideoCard = ({ id, title, thumbnail, price, duration, creator }: VideoCardProps) => {
  return (
    <Link to={`/video/${id}`} className="group block">
      <div className="glass-card overflow-hidden hover:border-accent/30 transition-all duration-300">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-16 h-16 rounded-full bg-accent/90 flex items-center justify-center shadow-lg shadow-accent/50">
              <Play className="w-7 h-7 text-accent-foreground ml-1" fill="currentColor" />
            </div>
          </div>

          {/* Duration */}
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-background/80 backdrop-blur text-xs font-medium">
            {duration}
          </div>

          {/* Price tag */}
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {price.toFixed(2)}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-display font-semibold text-lg mb-1 line-clamp-2 group-hover:text-accent transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">by {creator}</p>
        </div>
      </div>
    </Link>
  );
};