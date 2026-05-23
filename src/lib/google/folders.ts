export type DriveFolderKey =
  | "students"
  | "teachers"
  | "parents"
  | "posters"
  | "certificates"
  | "announcements";

const DEFAULTS: Record<DriveFolderKey, string> = {
  teachers:      "1TRnGXnjCY7c4OKtVWJSwXLcvIKzKJ1TU",
  students:      "1m9AtmDhtje_vBFgsUWstQnKJeReGIfTN",
  parents:       "1bBwK2-emly4lpO7KD7EFz0H-VcVLb3Wq",
  posters:       "1rP4OL4BQoalRh8mt5R93deoMQmtWRtBn",
  certificates: "15z4pIXHZAfrmcEhmMoOkgJYyx-wmH9UZ",
  announcements: "1aQhpKOk2qAU8BGISmgVWwDTcgW40G42j",
};

export const DRIVE_FOLDERS: Record<DriveFolderKey, string> = {
  students:      process.env.GOOGLE_DRIVE_FOLDER_STUDENTS      ?? DEFAULTS.students,
  teachers:      process.env.GOOGLE_DRIVE_FOLDER_TEACHERS      ?? DEFAULTS.teachers,
  parents:       process.env.GOOGLE_DRIVE_FOLDER_PARENTS       ?? DEFAULTS.parents,
  posters:       process.env.GOOGLE_DRIVE_FOLDER_POSTERS       ?? DEFAULTS.posters,
  certificates:  process.env.GOOGLE_DRIVE_FOLDER_CERTIFICATES  ?? DEFAULTS.certificates,
  announcements: process.env.GOOGLE_DRIVE_FOLDER_ANNOUNCEMENTS ?? DEFAULTS.announcements,
};
