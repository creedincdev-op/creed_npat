import Image from "next/image";
import { Player } from "../../app.types";
import styles from "./score-table.module.css";

interface ScoreTableProps {
  players: Player[];
  position: number;
}

export const ScoreTable: React.FC<ScoreTableProps> = ({
  players,
  position,
}) => {
  return (
    <div className={styles.scoreTable}>
      <div key="header" className={styles.scoreboardItem}>
        <div className={styles.position} />
        <div className={styles.name}>Name</div>
        <div className={styles.finalScore}>Score</div>
      </div>
      {players.map((player: any, index: number) => {
        const scoreboardItemStyles =
          position === index
            ? styles.scoreboardItemHighlight
            : styles.scoreboardItem;

        return (
          <div key={index} className={scoreboardItemStyles}>
            <div className={styles.position}>
              {player.place}
            </div>
            <div className={styles.name}>
              <Image
                alt={`${player.name} avatar`}
                className={styles.avatar}
                height={22}
                src={player.emoji}
                width={22}
              />{" "}
              {player.name}
            </div>
            <div className={styles.finalScore}>{player.score}</div>
          </div>
        );
      })}
    </div>
  );
};
