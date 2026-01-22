import { useState, useEffect } from "react";
import { IUser } from "../types";
import { checkAuth } from "../services/authService";

export interface UserProfile {
  phone: string;
  gender: string;
  birth: string;
}

export function useUserProfile() {
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);

  const [formData, setFormData] = useState<UserProfile>({
    phone: "",
    gender: "",
    birth: "",
  });

  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await checkAuth();
        if (user) {
          setCurrentUser(user);
        }

        let savedProfile: UserProfile | null = null;
        let savedAvatar: string | null = null;

        try {
          const profileLS = localStorage.getItem("userProfile");
          savedProfile = profileLS ? JSON.parse(profileLS) : null;
        } catch {
          savedProfile = null;
        }

        const avatarLS = localStorage.getItem("userAvatar");
        if (avatarLS && avatarLS.startsWith("data:image")) {
          savedAvatar = avatarLS;
        } else {
          savedAvatar = null;
        }

        setFormData({
          phone: savedProfile?.phone || "",
          gender: savedProfile?.gender || "",
          birth: savedProfile?.birth || "",
        });

        setAvatar(savedAvatar);
      } catch (error) {
        console.error("Lỗi load profile:", error);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = () => {
    const dataToSave: UserProfile = {
      phone: formData.phone,
      gender: formData.gender,
      birth: formData.birth,
    };

    localStorage.setItem("userProfile", JSON.stringify(dataToSave));
  };

  const clearProfile = () => {
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userAvatar");

    setFormData({
      phone: "",
      gender: "",
      birth: "",
    });

    setAvatar(null);
  };

  return {
    currentUser,
    formData,
    setFormData,
    avatar,
    setAvatar,
    saveProfile,
    clearProfile,
  };
}
