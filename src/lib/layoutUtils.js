// Utility functions and constants for layout/navigation
import {
  // Essential Navigation & UI
  FileText, Play, Calendar, BookOpen, Users, GraduationCap,
  Settings as SettingsIcon, Mail, Home, Crown, Globe, ArrowLeft, Search, Star,

  // Core Categories (1-2 icons per category)
  File, Folder, Hammer, Wrench, Gamepad, Trophy, Building, School,
  Book, Brain, User, UserCircle, Camera, Video,

  // Common Actions
  Edit, Plus, Check, X, Shield, Code, Heart, Bookmark
} from "lucide-react";

export const iconMap = {
  // Essential Navigation & UI (15 icons)
  'FileText': FileText,
  'Play': Play,
  'Calendar': Calendar,
  'BookOpen': BookOpen,
  'Users': Users,
  'GraduationCap': GraduationCap,
  'Settings': SettingsIcon,
  'SettingsIcon': SettingsIcon,
  'Mail': Mail,
  'Home': Home,
  'Crown': Crown,
  'Globe': Globe,
  'ArrowLeft': ArrowLeft,
  'Search': Search,
  'Star': Star,

  // Core Categories (14 icons - 1-2 per navigation category)
  'File': File,
  'Folder': Folder,
  'Hammer': Hammer,
  'Wrench': Wrench,
  'Gamepad': Gamepad,
  'Trophy': Trophy,
  'Building': Building,
  'School': School,
  'Book': Book,
  'Brain': Brain,
  'User': User,
  'UserCircle': UserCircle,
  'Camera': Camera,
  'Video': Video,

  // Common Actions (8 icons)
  'Edit': Edit,
  'Plus': Plus,
  'Check': Check,
  'X': X,
  'Shield': Shield,
  'Code': Code,
  'Heart': Heart,
  'Bookmark': Bookmark
};

// Note: Navigation items are now managed centrally in /src/config/productTypes.js
// This file only contains the icon mapping for compatibility

// ...other shared layout utils can be added here...