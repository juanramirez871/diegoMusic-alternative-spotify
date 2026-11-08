import { useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { DEFAULT_USER_AVATAR } from '@/constants/images';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { menuStyles } from './styles.web';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="menuitem"
      style={[menuStyles.item, hovered && menuStyles.itemHovered]}
    >
      <Text style={menuStyles.itemText}>{label}</Text>
    </Pressable>
  );
}

/** Account dropdown anchored under the avatar. */
export function UserMenu({ visible, onClose, onOpenSettings }: Props) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const handleSettings = () => {
    onClose();
    onOpenSettings();
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={menuStyles.backdrop} onPress={onClose}>
        <Pressable style={menuStyles.menu} onPress={(event) => event.stopPropagation()} accessibilityRole="menu">
          <View style={menuStyles.userInfo}>
            <Image source={user?.avatar ? { uri: user.avatar } : DEFAULT_USER_AVATAR} style={menuStyles.userAvatar} />
            <View style={menuStyles.userText}>
              <Text style={menuStyles.userName} numberOfLines={1}>{user?.name}</Text>
              <Text style={menuStyles.userEmail} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>
          <View style={menuStyles.divider} />
          <MenuItem label={t('tabs.settings')} onPress={handleSettings} />
          <View style={menuStyles.divider} />
          <MenuItem label={t('topBar.logout')} onPress={handleLogout} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
