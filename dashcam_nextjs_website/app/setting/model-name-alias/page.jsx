'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/User/DashboardComponent/Navbar/Navbar';
import SettingsSidebar from '@/components/User/DashboardComponent/SettingsSidebar/SettingsSidebar';

export default function ModelNameAliasPage() {
  const [models, setModels] = useState([
    { id: 1, defaultName: 'PL601', alias: '' },
    { id: 2, defaultName: 'JC261P', alias: '' },
    { id: 3, defaultName: 'JC182', alias: '' },
    { id: 4, defaultName: 'VL505', alias: '' },
    { id: 5, defaultName: 'VL502', alias: '' }
  ]);
  const [editingId, setEditingId] = useState(null);
  const [editAlias, setEditAlias] = useState('');

  const handleEdit = (id, currentAlias) => {
    setEditingId(id);
    setEditAlias(currentAlias);
  };

  const handleSave = (id) => {
    setModels(models.map(model => 
      model.id === id ? { ...model, alias: editAlias } : model
    ));
    setEditingId(null);
    setEditAlias('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditAlias('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar activeTab="Settings" onTabChange={() => {}} />
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar />
        <div className="flex-1 overflow-auto bg-white">
          <div className="max-w-6xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Model Name Alias</h1>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      NO.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Default Model Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Alias Model Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {models.map((model, index) => (
                    <tr key={model.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {model.defaultName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingId === model.id ? (
                          <input
                            type="text"
                            value={editAlias}
                            onChange={(e) => setEditAlias(e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            placeholder="Enter alias name"
                            autoFocus
                          />
                        ) : (
                          <span className="text-gray-500">{model.alias || '-'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingId === model.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSave(model.id)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="text-gray-600 hover:text-gray-800 font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(model.id, model.alias)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
