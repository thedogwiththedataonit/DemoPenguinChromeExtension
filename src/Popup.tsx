import React from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import './styles.css';

const LOGIN_URL = 'http://localhost:3000/chrome-extension/login';

export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    plan: "hobby" | "pro";
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
}

const VERIFY_URL = 'http://localhost:3000/api/verify';

const Popup: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userData, setUserData] = React.useState<User | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const verifyToken = async (token: string) => {
      try {
        const response = await fetch(VERIFY_URL, {
          method: 'GET',
          headers: {
            'demo-penguin-auth-user-id': token
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('userData', userData);
          setUserData(userData);
          setIsLoggedIn(true);
          setError(null);
        } else {
          // Token is invalid, remove it
          await chrome.storage.local.remove('userId');
          setIsLoggedIn(false);
          setError('Invalid token. Please log in again.');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        setIsLoggedIn(false);
        setError('Failed to verify token. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    // Check for existing auth token when component mounts
    chrome.storage.local.get(['userId'], (result) => {
      const userId = result.userId;
      if (userId) {
        console.log('userId', userId);
        verifyToken(userId);
      } else {
        setIsLoggedIn(false);
        setError('No user ID found. Please log in.');
        setIsLoading(false);
      }
    });
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const loginTab = await chrome.tabs.create({
        url: LOGIN_URL,
        active: true
      });

      // Listen for messages from the login page
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'LOGIN_SUCCESS' && message.userId) {
          chrome.storage.local.set({ userId: message.userId }, () => {
            if (chrome.runtime.lastError) {
              console.error('Error saving user ID:', chrome.runtime.lastError);
              setError('Failed to save user ID. Please try again.');
            } else {
              setIsLoggedIn(true);
              setError(null);
              if (loginTab.id) {
                chrome.tabs.remove(loginTab.id);
              }
            }
            setIsLoading(false);
          });
        }
      });
    } catch (error) {
      console.error('Failed to open login tab:', error);
      setError('Failed to open login page. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 p-4 bg-gray-100">
      <Card className="bg-white shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="bg-blue-600 text-white p-4">
          <CardTitle className="text-xl font-bold">Welcome to DemoPenguin</CardTitle>
          <CardDescription className="text-blue-100">
            {isLoggedIn 
              ? `Signed in as ${userData?.name || userData?.email}` 
              : 'Sign in to access your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <img src="penguin-walk.gif" alt="Loading..." className="w-16 h-16" />
            </div>
          ) : (
            <>
              {!isLoggedIn && (
                <Button onClick={handleLogin} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                  Sign into DemoPenguin
                </Button>
              )}
              {isLoggedIn && (
                <p className="text-center text-green-600 font-semibold">
                  ✓ Successfully logged in
                </p>
              )}
              {error && (
                <p className="text-center text-red-600 mt-2 font-medium">
                  {error}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById('root')
);

