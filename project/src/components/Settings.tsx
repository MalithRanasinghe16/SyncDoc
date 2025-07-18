import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDocuments } from '../contexts/DocumentContext';
import { 
  User, 
  Settings as SettingsIcon, 
  Bell, 
  Palette, 
  LogOut,
  Moon,
  Sun,
  Monitor,
  Save,
  Trash2,
  EyeOff,
  Download,
  X,
  AlertTriangle
} from 'lucide-react';

type Tab = 'general' | 'appearance' | 'notifications' | 'account';

export default function Settings() {
  const { user, logout, deleteAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { documents, refreshDocuments } = useDocuments();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [preferences, setPreferences] = useState({
    language: 'en',
    autoSave: true,
    spellCheck: true,
    wordWrap: true,
    lineNumbers: false,
  });

  const tabs = [
    { id: 'general' as Tab, label: 'General', icon: SettingsIcon },
    { id: 'appearance' as Tab, label: 'Appearance', icon: Palette },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'account' as Tab, label: 'Account', icon: User },
  ];

  const exportDocumentsAsPDF = async () => {
    if (!documents || documents.length === 0) {
      alert('No documents found to export.');
      return;
    }

    setIsExporting(true);
    
    try {
      // Refresh documents to ensure we have the latest data
      await refreshDocuments();
      
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export documents.');
        return;
      }

      // Generate HTML content for all documents
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>SyncDoc Export - ${user?.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .document {
              margin-bottom: 40px;
              page-break-after: always;
            }
            .document-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #059669;
              border-bottom: 2px solid #059669;
              padding-bottom: 5px;
            }
            .document-meta {
              font-size: 12px;
              color: #666;
              margin-bottom: 20px;
            }
            .document-content {
              font-size: 14px;
              line-height: 1.8;
            }
            .document-content h1, .document-content h2, .document-content h3 {
              color: #374151;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            .document-content p {
              margin-bottom: 10px;
            }
            .document-content ul, .document-content ol {
              margin-bottom: 10px;
              padding-left: 20px;
            }
            @media print {
              body { margin: 0; }
              .document { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          ${documents.map(doc => `
            <div class="document">
              <h2 class="document-title">${doc.title}</h2>
              <div class="document-meta">
                Created: ${new Date(doc.createdAt).toLocaleDateString()} | 
                Last Updated: ${new Date(doc.updatedAt).toLocaleDateString()}
              </div>
              <div class="document-content">
                ${doc.content || '<p><em>No content</em></p>'}
              </div>
            </div>
          `).join('')}
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Close the window after printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      // Account deleted successfully, user will be logged out automatically
    } catch (error) {
      console.error('Delete account failed:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-6">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-3 ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Editor Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-save</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Automatically save your work</p>
                      </div>
                      <button
                        onClick={() => setPreferences(prev => ({ ...prev, autoSave: !prev.autoSave }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preferences.autoSave ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.autoSave ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Spell Check</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Check spelling as you type</p>
                      </div>
                      <button
                        onClick={() => setPreferences(prev => ({ ...prev, spellCheck: !prev.spellCheck }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preferences.spellCheck ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.spellCheck ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Word Wrap</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Wrap long lines in the editor</p>
                      </div>
                      <button
                        onClick={() => setPreferences(prev => ({ ...prev, wordWrap: !prev.wordWrap }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preferences.wordWrap ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.wordWrap ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Line Numbers</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Show line numbers in editor</p>
                      </div>
                      <button
                        onClick={() => setPreferences(prev => ({ ...prev, lineNumbers: !prev.lineNumbers }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preferences.lineNumbers ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.lineNumbers ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Language & Region</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={preferences.language}
                        onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="ru">Russian</option>
                        <option value="ja">Japanese</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      localStorage.setItem('editorPreferences', JSON.stringify(preferences));
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Theme</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors ${
                      theme === 'light' 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-yellow-500" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Light</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Light theme</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors ${
                      theme === 'dark' 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-blue-500" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">Dark</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Dark theme</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setTheme('system')}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors ${
                      theme === 'system' 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Monitor className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white">System</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Follow system preference</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notification Preferences</h3>
                <p className="text-gray-600 dark:text-gray-400">Manage how you receive notifications</p>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">{user?.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account Actions</h3>
                  <div className="space-y-3">
                    <button
                      disabled
                      className="w-full text-left px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg cursor-not-allowed opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Change Password</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Update your account password</div>
                        </div>
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>

                    <button
                      onClick={exportDocumentsAsPDF}
                      disabled={isExporting}
                      className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {isExporting ? 'Exporting...' : 'Export Data'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {isExporting ? 'Preparing your documents' : 'Download all your documents as PDF'}
                          </div>
                        </div>
                        {isExporting ? (
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin" />
                        ) : (
                          <Download className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    <button
                      onClick={openDeleteModal}
                      disabled={isDeleting}
                      className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-red-600 dark:text-red-400">Delete Account</div>
                          <div className="text-sm text-red-500 dark:text-red-400">Permanently delete your account and all data</div>
                        </div>
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </div>
                    </button>

                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Account</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">This will permanently delete:</h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>• Your account and profile information</li>
                    <li>• All your documents and their content</li>
                    <li>• Document version history</li>
                    <li>• Collaboration access to shared documents</li>
                  </ul>
                </div>
              </div>

              {user && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
