import Image from "next/image";
import { Player } from "../../app.types";
import styles from "./user-list.module.css";

interface PlayerWithScore extends Player {
  ready?: boolean;
  score?: number;
}

interface UserListProps {
  players: PlayerWithScore[];
}

export const UserList: React.FC<UserListProps> = ({
  players,
}) => {
  return (
    <div className={styles.userList}>
      {players &&
        players.map((player, index) => (
          <div key={`${player.userId}-${index}`}>
            <Image
              alt={`${player.name} avatar`}
              className={styles.avatar}
              height={78}
              src={player.emoji}
              width={78}
            />
            <p className={styles.name}>{player.name}</p>
            {player.leader && <p className={styles.badge}>Host</p>}
            {player.score !== undefined && <p className={styles.score}>{player.score}</p>}
            {player.ready && <p className={styles.ready}>Ready</p>}
          </div>
        ))}
    </div>
  );
};
