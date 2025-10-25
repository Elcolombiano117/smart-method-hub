import { useRef, useState } from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Upload, Lock, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    company: profile?.company || '',
    position: profile?.position || '',
    bio: profile?.bio || '',
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar');
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen');
      return;
    }

    try {
      setIsUploading(true);

      // Procesar imagen: recortar a cuadrado y comprimir a WebP 512x512
      const processed = await processImageToSquareWebp(file, 512, 0.85);
      const ext = 'webp';
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, processed, { cacheControl: '3600', upsert: true, contentType: processed.type });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Foto de perfil actualizada');
    } catch (err: any) {
      if (err?.message?.includes('does not exist') || err?.statusCode === '404') {
        toast.error('No existe el bucket "avatars" en Supabase. Créalo y habilita acceso público.');
      } else {
        toast.error(err?.message || 'Error al subir la imagen');
      }
    } finally {
      setIsUploading(false);
      // limpiar input para permitir volver a seleccionar el mismo archivo
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Utilidad: recortar al centro y comprimir a WebP
  const processImageToSquareWebp = async (file: File, targetSize = 512, quality = 0.85): Promise<Blob> => {
    const img = await fileToImage(file);
    const { width: w, height: h } = img;
    const size = Math.min(w, h);
    const sx = (w - size) / 2;
    const sy = (h - size) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear el contexto de canvas');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob) return blob;
    // Fallback
    const dataUrl = canvas.toDataURL('image/webp', quality);
    return dataURLToBlob(dataUrl);
  };

  const fileToImage = async (file: File): Promise<HTMLImageElement> => {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      });
      return img;
    } finally {
      // no revocamos aún por si canvas requiere relectura; safe to revoke here
      URL.revokeObjectURL(url);
    }
  };

  const dataURLToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/webp';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('Contraseña actualizada');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar contraseña');
    }
  };

  const getInitials = () => {
    const name = profile?.full_name || user?.email || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal y configuración</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile?.full_name || 'Usuario'}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="preferences">Preferencias</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza tu información de perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={profileData.company}
                    onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                    placeholder="Nombre de tu empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={profileData.position}
                    onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                    placeholder="Tu cargo o especialidad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografía</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Cuéntanos sobre ti..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSaveProfile}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
                <CardDescription>Sube una imagen para tu perfil</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button variant="outline" onClick={handleOpenFilePicker} disabled={isUploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? 'Subiendo...' : 'Subir Imagen'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Formatos recomendados: JPG, PNG, WEBP. Tamaño máximo ~5MB.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Cambiar Contraseña
                </CardTitle>
                <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>
                <Button onClick={handleChangePassword}>
                  Actualizar Contraseña
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Idioma
                </CardTitle>
                <CardDescription>Selecciona tu idioma preferido</CardDescription>
              </CardHeader>
              <CardContent>
                <select className="w-full p-2 border rounded-md">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
