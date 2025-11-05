import React from 'react';

const StudentClassView = ({ classes = [], loading = false }) => {
  console.log('📚 StudentClassView rendered with:', { 
    classesCount: classes.length, 
    loading,
    classes: classes 
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Enrolled Classes</h2>
        
        {classes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Enrolled</h3>
            <p className="text-gray-600">You are not enrolled in any classes yet. Contact your teacher to get enrolled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classes.map((classItem) => (
              <div key={classItem._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                    <p className="text-sm text-gray-600">{classItem.subject}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {classItem.code}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <p>📅 <strong>Schedule:</strong> {classItem.schedule}</p>
                  <p>👥 <strong>Students:</strong> {classItem.students?.length || 0}</p>
                  <p>👨‍🏫 <strong>Teacher:</strong> {classItem.teacher?.name || 'N/A'}</p>
                </div>
                
                {classItem.description && (
                  <p className="mt-4 text-sm text-gray-600 italic">{classItem.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(StudentClassView);
