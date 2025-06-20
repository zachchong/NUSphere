import { DataTypes, Model } from "sequelize";

import { sequelize } from "./database.js";

class User extends Model {}

User.init(
  {
    uid: {
      allowNull: false,
      type: DataTypes.STRING,
    },
  },
  {
    sequelize,
  },
);
await User.sync({ alter: true });
export default User;
