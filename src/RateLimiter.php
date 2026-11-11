<?php
/**
 * Marklight – tiny file-based fixed-window rate limiter.
 * Engineered by EinfachDev · GPL-3.0-or-later
 *
 * Privacy: client IPs are never written in clear text. Each bucket file is named after
 * HMAC-SHA256(ip, random-instance-secret) and is deleted once its window has expired.
 */
declare(strict_types=1);

namespace Marklight;

final class RateLimiter
{
    private string $dir;

    public function __construct(private readonly int $limit, private readonly int $window, ?string $dir = null)
    {
        $this->dir = $dir ?? rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'marklight-rl';
    }

    /** @return int 0 if allowed, otherwise seconds until the client may retry */
    public function hit(string $clientKey): int
    {
        if ($this->limit <= 0) {
            return 0;
        }
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0700, true) && !is_dir($this->dir)) {
            return 0; // fail open: rate limiting is abuse protection, not a security boundary
        }
        $file = $this->dir . DIRECTORY_SEPARATOR . hash_hmac('sha256', $clientKey, $this->secret()) . '.json';
        $fh = @fopen($file, 'c+');
        if ($fh === false) {
            return 0;
        }
        try {
            flock($fh, LOCK_EX);
            $now = time();
            $data = json_decode((string) stream_get_contents($fh), true);
            if (!is_array($data) || ($data['start'] ?? 0) + $this->window <= $now) {
                $data = ['start' => $now, 'count' => 0];
            }
            $data['count']++;
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($data, JSON_THROW_ON_ERROR));
            fflush($fh);
            $retry = $data['count'] > $this->limit ? max(1, $data['start'] + $this->window - $now) : 0;
        } finally {
            flock($fh, LOCK_UN);
            fclose($fh);
        }
        if (random_int(1, 50) === 1) {
            $this->gc();
        }
        return $retry;
    }

    private function secret(): string
    {
        $file = $this->dir . DIRECTORY_SEPARATOR . '.secret';
        $secret = @file_get_contents($file);
        if (!is_string($secret) || strlen($secret) < 32) {
            $secret = bin2hex(random_bytes(32));
            @file_put_contents($file, $secret, LOCK_EX);
            @chmod($file, 0600);
        }
        return $secret;
    }

    private function gc(): void
    {
        foreach (glob($this->dir . DIRECTORY_SEPARATOR . '*.json') ?: [] as $f) {
            if (@filemtime($f) < time() - $this->window * 2) {
                @unlink($f);
            }
        }
    }
}
