import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Reads device orientation tilt for smooth mobile steering,
 * handling portrait/landscape screen angles, deadzone, smoothing,
 * zero-point calibration, and iOS 13+ permission requests.
 */
export function useGyroscope(enabled) {
  const isSupported =
    typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

  const needsPermission =
    typeof window !== 'undefined' &&
    typeof window.DeviceOrientationEvent?.requestPermission === 'function';

  const [permission, setPermission] = useState(() =>
    !isSupported ? 'unsupported' : needsPermission ? 'prompt' : 'granted'
  );
  const [hasSensorData, setHasSensorData] = useState(false);

  const steerRef = useRef(0); // Normalized -1 (left) .. +1 (right)
  const rawAngleRef = useRef(0);
  const zeroOffsetRef = useRef(0);
  const smoothedRef = useRef(0);

  const getScreenAngle = () => {
    if (typeof window === 'undefined') return 0;
    return (
      window.screen?.orientation?.angle ??
      (typeof window.orientation === 'number' ? window.orientation : 0)
    );
  };

  const requestAccess = useCallback(async () => {
    if (!isSupported) {
      setPermission('unsupported');
      return false;
    }
    if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const result = await window.DeviceOrientationEvent.requestPermission();
        if (result === 'granted') {
          setPermission('granted');
          return true;
        }
        setPermission('denied');
        return false;
      } catch {
        setPermission('denied');
        return false;
      }
    }
    setPermission('granted');
    return true;
  }, [isSupported]);

  const recalibrate = useCallback(() => {
    zeroOffsetRef.current = rawAngleRef.current;
    smoothedRef.current = 0;
    steerRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled || !isSupported || permission !== 'granted') {
      steerRef.current = 0;
      smoothedRef.current = 0;
      return undefined;
    }

    const DEADZONE_DEG = 2.5;
    const MAX_TILT_DEG = 24;

    const handleOrientation = (e) => {
      if (e.gamma === null && e.beta === null) return;
      setHasSensorData(true);

      const angle = getScreenAngle();
      let tilt = 0;
      if (angle === 90) {
        tilt = e.beta ?? 0;
      } else if (angle === -90 || angle === 270) {
        tilt = -(e.beta ?? 0);
      } else if (angle === 180) {
        tilt = -(e.gamma ?? 0);
      } else {
        tilt = e.gamma ?? 0;
      }

      rawAngleRef.current = tilt;
      const adjusted = tilt - zeroOffsetRef.current;

      let normalized = 0;
      if (Math.abs(adjusted) > DEADZONE_DEG) {
        const sign = adjusted > 0 ? 1 : -1;
        const effective = Math.min(
          MAX_TILT_DEG - DEADZONE_DEG,
          Math.abs(adjusted) - DEADZONE_DEG
        );
        normalized = sign * (effective / (MAX_TILT_DEG - DEADZONE_DEG));
      }

      // Exponential smoothing to reduce sensor jitter
      smoothedRef.current = smoothedRef.current * 0.62 + normalized * 0.38;
      steerRef.current = Math.max(-1, Math.min(1, smoothedRef.current));
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      steerRef.current = 0;
      smoothedRef.current = 0;
    };
  }, [enabled, isSupported, permission]);

  return {
    isSupported,
    needsPermission,
    permission,
    hasSensorData,
    steerRef,
    requestAccess,
    recalibrate,
  };
}
