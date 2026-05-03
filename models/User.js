import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    isAdmin: { type: Boolean, default: false },

    twoFactorEnabled: { type: Boolean, default: false },

    /* 🔒 LOCK SYSTEM */
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    /* 🔐 FORCE PASSWORD CHANGE */
    mustChangePassword: { type: Boolean, default: false },

    /* 🛒 CART */
    cart: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        image: String,
        category: String,
        quantity: { type: Number, default: 1 },
      },
    ],
  },
  { timestamps: true }
);

/* 🔐 HASH PASSWORD */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* 🔑 MATCH PASSWORD */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;