-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is2FAEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "deletedAt" DATETIME,
    "anonymizedAt" DATETIME
);
INSERT INTO "new_User" ("avatar", "createdAt", "displayName", "email", "id", "password") SELECT "avatar", "createdAt", "displayName", "email", "id", "password" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
