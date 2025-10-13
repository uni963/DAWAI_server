/**
 * Ghost Text ジャンル・スケール選択機能 E2Eテスト
 * TDD形式で期待動作を定義
 *
 * @file ghost-text-genre-scale.spec.js
 * @author Claude Code
 * @date 2025-10-05
 */

import { test, expect } from '@playwright/test'

test.describe('Ghost Text ジャンル・スケール選択機能', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーション起動
    await page.goto('http://localhost:5175')
    await page.waitForLoadState('networkidle')

    // AI Assistantパネルを開いてGhost Text設定にアクセス
    await page.click('[aria-label="AI Assistant toggle"]')
    await page.waitForSelector('.ghost-text-panel', { state: 'visible' })
  })

  test('ジャンル選択機能のUI表示テスト', async ({ page }) => {
    // 期待する動作：詳細設定を開くと音楽理論設定が表示される
    await page.click('[data-testid="ghost-text-advanced-toggle"]')

    // 音楽理論設定セクションが表示されることを確認
    await expect(page.locator('[data-testid="music-theory-section"]')).toBeVisible()

    // ジャンル選択プルダウンが表示されることを確認
    await expect(page.locator('[data-testid="genre-select"]')).toBeVisible()

    // 5つのジャンルオプション（POP, JAZZ, R&B, ROCK, BALLAD）が存在することを確認
    await page.click('[data-testid="genre-select"]')
    await expect(page.locator('text=ポップミュージック')).toBeVisible()
    await expect(page.locator('text=ジャズ')).toBeVisible()
    await expect(page.locator('text=R&B / ソウル')).toBeVisible()
    await expect(page.locator('text=ロック')).toBeVisible()
    await expect(page.locator('text=バラード')).toBeVisible()
  })

  test('スケール選択機能のUI表示テスト', async ({ page }) => {
    // 期待する動作：ジャンル選択後にスケール選択チェックボックスが表示される
    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="genre-select"]')
    await page.click('text=ポップミュージック')

    // スケール選択セクションが表示されることを確認
    await expect(page.locator('[data-testid="scales-section"]')).toBeVisible()

    // 4つのスケールオプションが表示されることを確認
    await expect(page.locator('[data-testid="scale-major"]')).toBeVisible()
    await expect(page.locator('[data-testid="scale-minor"]')).toBeVisible()
    await expect(page.locator('[data-testid="scale-pentatonic"]')).toBeVisible()
    await expect(page.locator('[data-testid="scale-bluenote"]')).toBeVisible()
  })

  test('スケール制約機能のON/OFFテスト', async ({ page }) => {
    // 期待する動作：スケール制約機能のON/OFFができる
    await page.click('[data-testid="ghost-text-advanced-toggle"]')

    // スケール制約スイッチが表示されることを確認
    await expect(page.locator('[data-testid="scale-constraint-toggle"]')).toBeVisible()

    // 初期状態はOFFであることを確認
    await expect(page.locator('[data-testid="scale-constraint-toggle"]')).not.toBeChecked()

    // ONに切り替えた時の動作確認
    await page.click('[data-testid="scale-constraint-toggle"]')
    await expect(page.locator('[data-testid="scale-constraint-toggle"]')).toBeChecked()

    // OFFに戻した時の動作確認
    await page.click('[data-testid="scale-constraint-toggle"]')
    await expect(page.locator('[data-testid="scale-constraint-toggle"]')).not.toBeChecked()
  })

  test('POPジャンル選択での推奨スケール表示テスト', async ({ page }) => {
    // 期待する動作：POPジャンル選択時にMajor, Minorスケールが推奨される
    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="genre-select"]')
    await page.click('text=ポップミュージック')

    // 推奨スケールが視覚的に強調表示されることを確認
    await expect(page.locator('[data-testid="scale-major"]')).toHaveClass(/recommended/)
    await expect(page.locator('[data-testid="scale-minor"]')).toHaveClass(/recommended/)
  })

  test('JAZZジャンル選択での推奨スケール表示テスト', async ({ page }) => {
    // 期待する動作：JAZZジャンル選択時にBlue Note, Minorスケールが推奨される
    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="genre-select"]')
    await page.click('text=ジャズ')

    // 推奨スケールが視覚的に強調表示されることを確認
    await expect(page.locator('[data-testid="scale-bluenote"]')).toHaveClass(/recommended/)
    await expect(page.locator('[data-testid="scale-minor"]')).toHaveClass(/recommended/)
  })

  test('音楽理論設定適用テスト', async ({ page }) => {
    // 期待する動作：設定変更がGhost Textエンジンに正しく適用される

    // MIDI Track作成
    await page.click('[data-testid="add-midi-track"]')
    await page.waitForSelector('[data-testid="midi-track-0"]')

    // MIDI Trackを選択してピアノロールエディタを開く
    await page.click('[data-testid="midi-track-0"]')
    await page.waitForSelector('[data-testid="piano-roll-editor"]')

    // Ghost Text機能を有効化
    await page.click('[data-testid="ai-assistant-toggle"]')
    await page.click('[data-testid="ghost-text-toggle"]')

    // 音楽理論設定を適用
    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="scale-constraint-toggle"]')
    await page.click('[data-testid="genre-select"]')
    await page.click('text=ポップミュージック')
    await page.click('[data-testid="scale-major"]')

    // ピアノロールでノートを入力
    const pianoRoll = page.locator('[data-testid="piano-roll-canvas"]')
    await pianoRoll.click({ position: { x: 100, y: 200 } }) // C4ノート追加

    // Ghost Text予測が表示されることを確認
    await expect(page.locator('[data-testid="ghost-note"]')).toBeVisible()

    // 予測されたノートがMajorスケール内であることを確認
    const ghostNotes = await page.locator('[data-testid="ghost-note"]').all()
    expect(ghostNotes.length).toBeGreaterThan(0)

    // コンソールでスケール制約が適用されていることを確認
    const logs = []
    page.on('console', msg => logs.push(msg.text()))

    await page.waitForTimeout(1000) // 予測処理完了を待機

    const scaleConstraintLogs = logs.filter(log =>
      log.includes('🎼 GhostText: Applying scale constraints')
    )
    expect(scaleConstraintLogs.length).toBeGreaterThan(0)
  })

  test('ジャンル・スケール設定の永続化テスト', async ({ page }) => {
    // 期待する動作：設定がページリロード後も保持される

    // 設定を変更
    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="scale-constraint-toggle"]')
    await page.click('[data-testid="genre-select"]')
    await page.click('text=ジャズ')
    await page.click('[data-testid="scale-bluenote"]')
    await page.click('[data-testid="scale-minor"]')

    // 設定が適用されていることを確認
    await expect(page.locator('[data-testid="scale-constraint-toggle"]')).toBeChecked()
    await expect(page.locator('[data-testid="genre-select"]')).toHaveText(/ジャズ/)

    // ページをリロード
    await page.reload()
    await page.waitForLoadState('networkidle')

    // AI Assistantパネルを再度開く
    await page.click('[aria-label="AI Assistant toggle"]')
    await page.click('[data-testid="ghost-text-advanced-toggle"]')

    // 設定が保持されていることを確認
    await expect(page.locator('[data-testid="scale-constraint-toggle"]')).toBeChecked()
    await expect(page.locator('[data-testid="genre-select"]')).toHaveText(/ジャズ/)
    await expect(page.locator('[data-testid="scale-bluenote"]')).toBeChecked()
    await expect(page.locator('[data-testid="scale-minor"]')).toBeChecked()
  })

  test('複数スケール選択機能テスト', async ({ page }) => {
    // 期待する動作：複数のスケールを同時に選択できる
    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="genre-select"]')
    await page.click('text=ロック')

    // 複数のスケールを選択
    await page.click('[data-testid="scale-pentatonic"]')
    await page.click('[data-testid="scale-minor"]')
    await page.click('[data-testid="scale-bluenote"]')

    // すべてのスケールが選択されていることを確認
    await expect(page.locator('[data-testid="scale-pentatonic"]')).toBeChecked()
    await expect(page.locator('[data-testid="scale-minor"]')).toBeChecked()
    await expect(page.locator('[data-testid="scale-bluenote"]')).toBeChecked()

    // Major スケールは選択されていないことを確認
    await expect(page.locator('[data-testid="scale-major"]')).not.toBeChecked()
  })

  test('音楽理論設定のリアルタイム更新テスト', async ({ page }) => {
    // 期待する動作：設定変更が即座にGhost Textエンジンに反映される

    // MIDI Track作成とGhost Text有効化
    await page.click('[data-testid="add-midi-track"]')
    await page.click('[data-testid="midi-track-0"]')
    await page.click('[data-testid="ai-assistant-toggle"]')
    await page.click('[data-testid="ghost-text-toggle"]')

    // 初期設定でノート入力
    const pianoRoll = page.locator('[data-testid="piano-roll-canvas"]')
    await pianoRoll.click({ position: { x: 100, y: 200 } })

    // コンソールログを監視
    const logs = []
    page.on('console', msg => logs.push(msg.text()))

    // 音楽理論設定を変更
    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="scale-constraint-toggle"]')

    await page.waitForTimeout(500)

    // 設定変更ログが出力されることを確認
    const settingsLogs = logs.filter(log =>
      log.includes('🎼 GhostText: Scale constraint enabled')
    )
    expect(settingsLogs.length).toBeGreaterThan(0)
  })

  test('エラーハンドリングテスト', async ({ page }) => {
    // 期待する動作：無効な設定や接続エラーが適切に処理される

    // ネットワーク接続を無効化してテスト
    await page.route('**/ai/**', route => route.abort())

    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="scale-constraint-toggle"]')
    await page.click('[data-testid="genre-select"]')
    await page.click('text=ポップミュージック')

    // エラー状態が適切に表示されることを確認
    await expect(page.locator('[data-testid="music-theory-error"]')).toBeVisible()

    // エラーメッセージが適切であることを確認
    await expect(page.locator('[data-testid="music-theory-error"]'))
      .toContainText('音楽理論設定の適用に失敗しました')
  })
})

test.describe('Ghost Text パフォーマンステスト', () => {
  test('音楽理論計算のパフォーマンステスト', async ({ page }) => {
    // 期待する動作：スケール制約適用が高速で実行される
    await page.goto('http://localhost:5175')
    await page.waitForLoadState('networkidle')

    // パフォーマンス測定開始
    await page.evaluate(() => window.performance.mark('music-theory-start'))

    // 音楽理論設定を適用
    await page.click('[data-testid="ai-assistant-toggle"]')
    await page.click('[data-testid="ghost-text-advanced-toggle"]')
    await page.click('[data-testid="scale-constraint-toggle"]')
    await page.click('[data-testid="genre-select"]')
    await page.click('text=ジャズ')
    await page.click('[data-testid="scale-bluenote"]')

    // パフォーマンス測定終了
    await page.evaluate(() => window.performance.mark('music-theory-end'))

    // 処理時間が100ms以下であることを確認
    const duration = await page.evaluate(() => {
      const measure = window.performance.measure(
        'music-theory-duration',
        'music-theory-start',
        'music-theory-end'
      )
      return measure.duration
    })

    expect(duration).toBeLessThan(100)
  })
})