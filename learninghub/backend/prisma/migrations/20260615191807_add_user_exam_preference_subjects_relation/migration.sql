-- Create implicit many-to-many relation between subjects and user_exam_preferences
CREATE TABLE "_SubjectToUserExamPreference" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

INSERT INTO "_SubjectToUserExamPreference" ("A", "B")
SELECT DISTINCT s.id, p.id
FROM "user_exam_preferences" p
CROSS JOIN LATERAL unnest(p."subjectIds") AS subjectId
JOIN "subjects" s ON s.id = subjectId;

CREATE UNIQUE INDEX "_SubjectToUserExamPreference_AB_unique" ON "_SubjectToUserExamPreference"("A", "B");
CREATE INDEX "_SubjectToUserExamPreference_B_index" ON "_SubjectToUserExamPreference"("B");

ALTER TABLE "_SubjectToUserExamPreference" ADD CONSTRAINT "_SubjectToUserExamPreference_A_fkey" FOREIGN KEY ("A") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_SubjectToUserExamPreference" ADD CONSTRAINT "_SubjectToUserExamPreference_B_fkey" FOREIGN KEY ("B") REFERENCES "user_exam_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
