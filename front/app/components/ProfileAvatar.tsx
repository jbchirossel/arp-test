'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ProfileAvatarProps {
  fullName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showUploadButton?: boolean;
  avatarUrl?: string; // URL explicite d'un avatar (pour afficher d'autres profils)
}

export default function ProfileAvatar({
  fullName,
  size = 'md',
  className = '',
  onClick,
  showUploadButton = false,
  avatarUrl
}: ProfileAvatarProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-14 h-14 text-xl'
  };

  const initials = (fullName || "U").split(" ").map(n => n[0]).join("").toUpperCase();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setShowUploadMenu(false);

    try {
      // 1. Supprimer l'ancien avatar s'il existe
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // 2. Générer le nom du fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // 3. Uploader le fichier sur Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 4. Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 5. Mettre à jour le profil dans la base de données
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 6. Rafraîchir le profil dans le context
      await refreshProfile();
      setProfileImage(publicUrl);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Erreur lors de l\'upload de l\'avatar. Veuillez réessayer.');
    } finally {
      setUploading(false);
    }
  };

  const removeProfileImage = async () => {
    if (!user || !profile?.avatar_url) return;

    setUploading(true);
    setShowUploadMenu(false);

    try {
      // 1. Extraire le chemin du fichier depuis l'URL
      const filePath = profile.avatar_url.split('/avatars/')[1];

      if (filePath) {
        // 2. Supprimer le fichier du storage
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      // 3. Mettre à jour le profil (supprimer l'URL)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 4. Rafraîchir le profil
      await refreshProfile();
      setProfileImage(null);

    } catch (error) {
      console.error('Error removing avatar:', error);
      alert('Erreur lors de la suppression de l\'avatar. Veuillez réessayer.');
    } finally {
      setUploading(false);
    }
  };

  // Charger l'avatar: priorité à avatarUrl passé en prop (pour d'autres utilisateurs), sinon profil courant
  useEffect(() => {
    if (avatarUrl) {
      setProfileImage(avatarUrl);
      return;
    }
    if (profile?.avatar_url) {
      setProfileImage(profile.avatar_url);
    } else {
      setProfileImage(null);
    }
  }, [profile, avatarUrl]);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUploadMenu(false);
      }
    }

    if (showUploadMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUploadMenu]);

  return (
    <div className="relative">
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-600 to-blue-700 dark:from-[#8c68d8] dark:to-[#7f49e8] flex items-center justify-center cursor-pointer font-bold border-2 border-white/20 hover:border-white/40 hover:scale-110 transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 dark:hover:shadow-[#8c68d8]/25 relative overflow-hidden group ${className}`}
        onClick={onClick}
        title={fullName}
      >
        {/* Effet de brillance */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {uploading ? (
          // Loader pendant l'upload
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : profileImage ? (
          // Photo de profil
          <img
            src={profileImage}
            alt={fullName}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          // Initiales avec effet de glow
          <span className="relative z-10 text-white drop-shadow-lg group-hover:drop-shadow-[#8c68d8]/50 transition-all duration-300">
            {initials}
          </span>
        )}
      </div>

      {/* Bouton d'upload si activé */}
      {showUploadButton && !uploading && (
        <button
          onClick={() => setShowUploadMenu(!showUploadMenu)}
          className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 dark:bg-[#8c68d8] rounded-full flex items-center justify-center text-white text-xs hover:scale-110 transition-transform shadow-lg"
          title="Modifier la photo"
        >
          <Camera className="w-3 h-3" />
        </button>
      )}

      {/* Menu d'upload */}
      {showUploadMenu && (
        <div 
          ref={menuRef}
          className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 min-w-[200px]"
        >
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
            Photo de profil
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Changer la photo
          </button>
          
          {profileImage && (
            <button
              onClick={removeProfileImage}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Supprimer la photo
            </button>
          )}
        </div>
      )}

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
} 