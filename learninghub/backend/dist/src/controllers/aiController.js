"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTutorResponse = exports.analyzeLearningPath = void 0;
const analyzeLearningPath = async (req, res) => {
    try {
        const { userId } = req.body;
        // Mock AI response
        const analysis = {
            strengths: ['JavaScript Fundamentals', 'Problem Solving'],
            weaknesses: ['Advanced System Design', 'Distributed Databases'],
            recommendation: 'Focus on System Design course and complete at least 5 medium difficulty problems.'
        };
        res.json({ status: 'success', data: analysis });
    }
    catch (error) {
        console.error('[AIController] analyze error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.analyzeLearningPath = analyzeLearningPath;
const getTutorResponse = async (req, res) => {
    try {
        const { message } = req.body;
        // Mock AI response
        const tutorMessage = `Based on your question "${message}", I recommend reviewing the "React Hooks" section in Course #2. Hooks allow you to use state and other React features without writing a class.`;
        res.json({ status: 'success', data: { response: tutorMessage } });
    }
    catch (error) {
        console.error('[AIController] tutor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getTutorResponse = getTutorResponse;
