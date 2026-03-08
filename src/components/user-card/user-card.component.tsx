import Image from "next/image";
import { Player } from "../../app.types";
import styles from "./user-card.module.css";

interface PlayerWithScore extends Player {
  ready?: boolean;
  score?: number;
}

interface UserCardProps {
  player: PlayerWithScore;
}

export const UserCard: React.FC<UserCardProps> = ({ player }) => {
  return (
    <div className={styles.userCard}>
      <div className={styles.avatarWrap}>
        <Image
          alt={`${player.name} avatar`}
          className={styles.avatar}
          height={84}
          src={player.emoji}
          width={84}
        />
      </div>
      <p className={styles.name}>{player.name}</p>
      {player.leader && <p className={styles.badge}>Host</p>}
      {player.score !== undefined && <p className={styles.score}>{player.score}</p>}
      {player.ready && <p className={styles.ready}>Ready</p>}
    </div>
  );
};
