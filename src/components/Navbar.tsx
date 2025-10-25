import { Settings, User, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Últimas "notificaciones": tomamos los últimos estudios creados por el usuario
  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as any[];
      const { data, error } = await supabase
        .from('studies')
        .select('id, process_name, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return [] as any[];
      return data as any[];
    },
    enabled: !!user?.id,
  });

  // Estado de "no leídas" persistido por usuario en localStorage
  const storageKey = user?.id ? `notifications_read_${user.id}` : null;
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!storageKey) {
      setReadIds(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setReadIds(new Set(parsed));
    } catch {
      setReadIds(new Set());
    }
  }, [storageKey]);

  const saveReadIds = (ids: Set<string>) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
    } catch {}
  };

  const unreadCount = useMemo(() => {
    if (!notifications || notifications.length === 0) return 0;
    return notifications.reduce((acc: number, n: any) => acc + (readIds.has(n.id) ? 0 : 1), 0);
  }, [notifications, readIds]);

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    const all = new Set((notifications ?? []).map((n: any) => n.id as string));
    setReadIds(all);
    saveReadIds(all);
  };

  const getInitials = () => {
    const name = profile?.full_name || user?.email || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">SM</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">SmartMethods</h1>
            <p className="text-xs text-muted-foreground">Ingeniería Industrial</p>
          </div>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[10px] leading-4 text-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : (notifications && notifications.length > 0) ? (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Notificaciones</p>
                  <p className="text-xs text-muted-foreground">Últimas actividades de tus estudios</p>
                </div>
                {(notifications && notifications.length > 0) && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllAsRead}>
                    Marcar todas
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-auto">
                {(!notifications || notifications.length === 0) ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No hay notificaciones
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="px-3 py-2 hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          markAsRead(n.id);
                          navigate(`/estudio/${n.id}`);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{n.process_name}</p>
                          {!readIds.has(n.id) && (
                            <span className="mt-0.5 inline-block w-2 h-2 rounded-full bg-primary" aria-label="No leído" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {n.status === 'completed' ? 'Completado' : n.status === 'in_progress' ? 'En progreso' : 'Creado'} • {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t p-2">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/mis-estudios')}>
                  Ver todos los estudios
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">{profile?.full_name || 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.position || user.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuración</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </nav>
  );
};
