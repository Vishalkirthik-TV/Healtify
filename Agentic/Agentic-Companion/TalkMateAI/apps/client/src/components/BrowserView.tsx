'use strict';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface BrowserViewProps {
  image: string | null;
}

const BrowserView: React.FC<BrowserViewProps> = ({ image }) => {
  if (!image) return null;

  return (
    <Card className="border-primary/20 absolute top-4 right-4 z-50 w-96 overflow-hidden border-2 bg-black/80 shadow-2xl backdrop-blur">
      <div className="relative flex aspect-video w-full items-center justify-center bg-black">
        {image && image !== 'LOADING' ? (
          <img
            src={`data:image/jpeg;base64,${image}`}
            alt="Agent Browser View"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs">Connecting to Browser...</span>
          </div>
        )}

        <div className="absolute right-2 bottom-2 rounded bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
          Agent View
        </div>
      </div>
    </Card>
  );
};

export default BrowserView;
