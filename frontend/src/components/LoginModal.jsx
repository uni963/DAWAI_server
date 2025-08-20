import { useState } from 'react'
import { Button } from './ui/button.jsx'
import { Input } from './ui/input.jsx'
import { Label } from './ui/label.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx'
import { Music, Lock, User } from 'lucide-react'

const LoginModal = ({ onLogin, isVisible }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // 簡単な認証（実際の運用ではサーバーサイドで認証）
    const validCredentials = [
      { username: 'dawai', password: 'beta2024' },
      { username: 'admin', password: 'admin2024' },
      { username: 'test', password: 'test123' }
    ]

    const isValid = validCredentials.some(
      cred => cred.username === username && cred.password === password
    )

    if (isValid) {
      // ログイン成功
      localStorage.setItem('dawai-auth', JSON.stringify({ username, timestamp: Date.now() }))
      onLogin({ username })
    } else {
      setError('ユーザー名またはパスワードが正しくありません')
    }

    setIsLoading(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Music className="h-8 w-8 text-blue-500 mr-2" />
            <h1 className="text-2xl font-bold">DAWAI Beta</h1>
          </div>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>
            AI統合DAWのベータ版にアクセスするにはログインしてください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザー名</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="ユーザー名を入力"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">テストアカウント</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>ユーザー名: <code>dawai</code> / パスワード: <code>beta2024</code></div>
              <div>ユーザー名: <code>admin</code> / パスワード: <code>admin2024</code></div>
              <div>ユーザー名: <code>test</code> / パスワード: <code>test123</code></div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            ⚠️ このベータ版には多くのバグが含まれる可能性があります
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginModal 