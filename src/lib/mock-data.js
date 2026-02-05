export const mockUser = {
    id: 'mock_user_123',
    email: 'mock@example.com',
    firstName: 'Mock',
    lastName: 'User',
    role: 'admin',
    username: 'admin'
};

export const mockQuizzes = [
    {
        id: 'quiz_1',
        title: 'Anatomy Basics',
        description: 'Introduction to Anatomy',
        created_date: new Date().toISOString()
    },
    {
        id: 'quiz_2',
        title: 'Physiology 101',
        description: 'Basic Physiology',
        created_date: new Date().toISOString()
    }
];

export const mockCourses = [
    {
        id: 'course_1',
        name: 'Anatomy',
        order: 1
    },
    {
        id: 'course_2',
        name: 'Physiology',
        order: 2
    }
];

export const mockSubjects = [
    {
        id: 'subject_1',
        name: 'Cardiology',
        order: 1
    }
];

export const mockFolders = [
    {
        id: 'folder_1',
        name: 'Week 1',
        order: 1
    }
];

export const mockQuizSettings = {
    time_limit: 30,
    passing_score: 70
};

export const mockLogs = {
    success: true
};
