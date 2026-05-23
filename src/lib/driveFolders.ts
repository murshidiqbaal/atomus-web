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
  certificates:  "15z4pIXHZAfrmcEhmMoOkgJYyx-wmH9UZ",
  announcements: "1aQhpKOk2qAU8BGISmgVWwDTcgW40G42j",
};

export const DRIVE_FOLDERS: Record<DriveFolderKey, string> = {
  students:      process.env.GOOGLE_DRIVE_FOLDER_STUDENTS      ?? process.env.GOOGLE_DRIVE_STUDENTS_FOLDER      ?? DEFAULTS.students,
  teachers:      process.env.GOOGLE_DRIVE_FOLDER_TEACHERS      ?? process.env.GOOGLE_DRIVE_TEACHERS_FOLDER      ?? DEFAULTS.teachers,
  parents:       process.env.GOOGLE_DRIVE_FOLDER_PARENTS       ?? process.env.GOOGLE_DRIVE_PARENTS_FOLDER       ?? DEFAULTS.parents,
  posters:       process.env.GOOGLE_DRIVE_FOLDER_POSTERS       ?? process.env.GOOGLE_DRIVE_POSTERS_FOLDER       ?? DEFAULTS.posters,
  certificates:  process.env.GOOGLE_DRIVE_FOLDER_CERTIFICATES  ?? process.env.GOOGLE_DRIVE_CERTIFICATES_FOLDER  ?? DEFAULTS.certificates,
  announcements: process.env.GOOGLE_DRIVE_FOLDER_ANNOUNCEMENTS ?? process.env.GOOGLE_DRIVE_ANNOUNCEMENTS_FOLDER ?? DEFAULTS.announcements,
};
