"""
DiffSinger Inference Engine

既存のneural_inference.pyをベースにした簡素化版
"""
import sys
from pathlib import Path
import torch

# DiffSingerモジュールインポート
sys.path.insert(0, str(Path(__file__).parent.parent))

from inference.svs.base_svs_infer import BaseSVSInfer
from utils import load_ckpt
from utils.hparams import set_hparams, hparams
from usr.diff.shallow_diffusion_tts import GaussianDiffusion
from usr.diffsinger_task import DIFF_DECODERS
from modules.fastspeech.pe import PitchExtractor
import utils


class DiffSingerEngine(BaseSVSInfer):
    """
    DiffSinger推論エンジン

    Attributes:
        sample_rate (int): サンプルレート
        device (str): 実行デバイス（cuda/cpu）
    """

    def __init__(self, config_path: str = None):
        """
        初期化

        Args:
            config_path: 設定ファイルパス（デフォルト: checkpoints/acoustic/config.yaml）
        """
        # 設定ロード
        if config_path is None:
            config_path = 'checkpoints/acoustic/config.yaml'

        set_hparams(config_path, exp_name='', print_hparams=False)

        # チェックポイントパス設定
        checkpoint_base = Path('checkpoints')
        hparams['work_dir'] = str(checkpoint_base / 'acoustic')
        hparams['pe_ckpt'] = str(checkpoint_base / 'pe')
        hparams['vocoder_ckpt'] = str(checkpoint_base / 'vocoder')

        # 親クラス初期化
        super().__init__(hparams)

        # 属性設定
        self.sample_rate = hparams['audio_sample_rate']
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'

        print(f"   Device: {self.device}")
        print(f"   Sample Rate: {self.sample_rate} Hz")
        print(f"   Timesteps: {hparams['timesteps']}")
        print(f"   K_step: {hparams['K_step']}")

    def build_model(self):
        """音響モデル構築"""
        model = GaussianDiffusion(
            phone_encoder=self.ph_encoder,
            out_dims=hparams['audio_num_mel_bins'],
            denoise_fn=DIFF_DECODERS[hparams['diff_decoder_type']](hparams),
            timesteps=hparams['timesteps'],
            K_step=hparams['K_step'],
            loss_type=hparams['diff_loss_type'],
            spec_min=hparams['spec_min'],
            spec_max=hparams['spec_max'],
        )
        model.eval()
        load_ckpt(model, hparams['work_dir'], 'model')

        # Pitch Extractor
        if hparams.get('pe_enable') and hparams['pe_enable']:
            self.pe = PitchExtractor().to(self.device)
            utils.load_ckpt(self.pe, hparams['pe_ckpt'], 'model', strict=True)
            self.pe.eval()

        return model

    def forward_model(self, inp):
        """
        推論実行

        Args:
            inp: 入力辞書（text, notes, notes_duration）

        Returns:
            音声波形（numpy array）
        """
        sample = self.input_to_batch(inp)

        with torch.no_grad():
            # Diffusion sampling
            output = self.model(
                sample['txt_tokens'],
                spk_id=sample.get('spk_ids'),
                ref_mels=None,
                infer=True,
                pitch_midi=sample['pitch_midi'],
                midi_dur=sample['midi_dur'],
                is_slur=sample['is_slur']
            )

            mel_out = output['mel_out']

            # F0予測
            if hparams.get('pe_enable') and hparams['pe_enable']:
                f0_pred = self.pe(mel_out)['f0_denorm_pred']
            else:
                f0_pred = output['f0_denorm']

            # Vocoder
            wav_out = self.run_vocoder(mel_out, f0=f0_pred)

        return wav_out.cpu().numpy()[0]

    def infer(self, inp: dict):
        """
        推論実行（外部API用）

        Args:
            inp: 入力辞書
                - text: 歌詞
                - notes: MIDI音名
                - notes_duration: ノート長さ
                - input_type: 'word' (デフォルト)

        Returns:
            音声波形（numpy array）
        """
        return self.infer_once(inp)
