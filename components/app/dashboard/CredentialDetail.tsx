import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Copy, Eye, EyeOff, ArrowLeft, X, Globe, Calendar, Tag } from "lucide-react";

export default function CredentialDetail({ 
  credential, 
  onClose, 
  isMobile 
}: {
  credential: any;
  onClose: () => void;
  isMobile: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Animation effect - show component after mount
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    // Desktop: outside-click to close
    const onDocumentPointerDown = (e: PointerEvent) => {
      if (isMobile) return;
      const node = rootRef.current!;
      if (!node) return;
      if (e.target instanceof Node && !node.contains(e.target)) {
        // clicked outside
        closeWithAnimation();
      }
    };

    document.addEventListener('pointerdown', onDocumentPointerDown);

    // Mobile: swipe to close (pointer gesture)
    if (isMobile) {
      let startX = 0;
      let currentX = 0;
      let startY = 0;
      let isTouching = false;
      let startTime = 0;

      const onPointerDown = (e: PointerEvent) => {
        if (e.pointerType === 'mouse') return;
        isTouching = true;
        startX = e.clientX;
        startY = e.clientY;
        currentX = startX;
        startTime = Date.now();
        (e.target as Element).setPointerCapture?.(e.pointerId);
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isTouching || !rootRef.current) return;
        currentX = e.clientX;
        const deltaX = currentX - startX;
        const deltaY = e.clientY - startY;
        // Ignore mostly-vertical moves
        if (Math.abs(deltaY) > Math.abs(deltaX)) return;
        // update transform
        rootRef.current.style.transition = 'none';
        rootRef.current.style.transform = `translateX(${Math.max(0, deltaX)}px)`;
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!isTouching || !rootRef.current) return;
        isTouching = false;
        const endX = e.clientX;
        const deltaX = endX - startX;
        const elapsed = Date.now() - startTime;
        const velocity = deltaX / (elapsed || 1);
        rootRef.current.style.transition = 'transform 200ms ease-out';
        if (deltaX > 80 || velocity > 0.5) {
          // animate off and close
          rootRef.current.style.transform = `translateX(100%)`;
          setTimeout(() => closeWithAnimation(), 190);
        } else {
          // snap back
          rootRef.current.style.transform = '';
        }
      };

      const node = rootRef.current;
      node.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      return () => {
        document.removeEventListener('pointerdown', onDocumentPointerDown);
        node.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown);
    };
  }, [isMobile]);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  if (!credential) return null;

  const handleCopy = (value: string, field: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  };

  // unified close that animates out then calls onClose
  const closeWithAnimation = () => {
    // trigger CSS class hide
    setIsVisible(false);
    // if we have ref, also set transform to ensure swipe-out look
    if (rootRef.current) {
      rootRef.current.style.transition = 'transform 300ms ease-out';
      rootRef.current.style.transform = 'translateX(100%)';
    }
    setTimeout(onClose, 300); // Wait for animation
  };

  // Parse custom fields if they exist
  let customFields = [];
  try {
    if (credential.customFields) {
      customFields = JSON.parse(credential.customFields);
    }
  } catch (e) {
    customFields = [];
  }

  // Format timestamps
  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Get favicon URL
  const getFaviconUrl = (url: string) => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const faviconUrl = getFaviconUrl(credential.url);

  return (
    <div ref={rootRef}
      className={`
        ${isMobile 
          ? 'fixed inset-0 z-50 bg-background' 
          : 'fixed top-0 right-0 h-full w-[400px] z-40 bg-background border-l border-border'
        }
        shadow-2xl flex flex-col transition-transform duration-300 ease-out
        ${isVisible 
          ? 'translate-x-0' 
          : isMobile ? 'translate-x-full' : 'translate-x-full'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        {isMobile ? (
          <Button variant="ghost" size="sm" onClick={closeWithAnimation} className="mr-3">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1">Back</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={closeWithAnimation} className="ml-auto">
            <X className="h-4 w-4" />
          </Button>
        )}
        {!isMobile && <span className="font-semibold text-lg">Credential Details</span>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Info */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mr-4 overflow-hidden">
              {faviconUrl ? (
                <img src={faviconUrl} alt="" className="w-8 h-8" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">
                  {credential.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">{credential.name}</h1>
              {credential.url && (
                <a 
                  href={credential.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-700 text-sm inline-flex items-center"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  {new URL(credential.url).hostname}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="p-6 space-y-6">
          {/* Username */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">Username / Email</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(credential.username, 'username')}
                className="h-6 px-2"
              >
                <Copy className="h-3 w-3" />
                {copied === 'username' && <span className="ml-1 text-xs">Copied!</span>}
              </Button>
            </div>
            <div className="bg-muted rounded-lg px-3 py-2 font-mono text-sm select-all break-all">
              {credential.username || <span className="text-muted-foreground italic">No username</span>}
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">Password</label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-6 px-2"
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(credential.password, 'password')}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                  {copied === 'password' && <span className="ml-1 text-xs">Copied!</span>}
                </Button>
              </div>
            </div>
            <div className="bg-muted rounded-lg px-3 py-2 font-mono text-sm select-all">
              {credential.password ? (
                showPassword ? credential.password : "•".repeat(Math.min(credential.password.length, 20))
              ) : (
                <span className="text-muted-foreground italic">No password</span>
              )}
            </div>
          </div>

          {/* Website URL */}
          {credential.url && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted-foreground">Website</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(credential.url, 'url')}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                  {copied === 'url' && <span className="ml-1 text-xs">Copied!</span>}
                </Button>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <a 
                  href={credential.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {credential.url}
                </a>
              </div>
            </div>
          )}

          {/* Notes */}
          {credential.notes && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(credential.notes, 'notes')}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                  {copied === 'notes' && <span className="ml-1 text-xs">Copied!</span>}
                </Button>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                {credential.notes}
              </div>
            </div>
          )}

          {/* Tags */}
          {credential.tags && credential.tags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                <Tag className="h-3 w-3 mr-1" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {credential.tags.map((tag: string, index: number) => (
                  <span 
                    key={index} 
                    className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Custom Fields</label>
              <div className="space-y-3">
                {customFields.map((field: any, index: number) => (
                  <div key={field.id || index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {field.label || `Field ${index + 1}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(field.value, `custom-${index}`)}
                        className="h-5 px-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copied === `custom-${index}` && <span className="ml-1 text-xs">Copied!</span>}
                      </Button>
                    </div>
                    <div className="bg-muted rounded px-2 py-1 font-mono text-xs select-all">
                      {field.value || <span className="text-muted-foreground italic">Empty</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-border">
            <label className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Information
            </label>
            <div className="space-y-2 text-xs text-muted-foreground">
              {credential.createdAt && (
                <div>Created: {formatDate(credential.createdAt)}</div>
              )}
              {credential.updatedAt && (
                <div>Updated: {formatDate(credential.updatedAt)}</div>
              )}
              {credential.folderId && (
                <div>Folder ID: {credential.folderId}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
