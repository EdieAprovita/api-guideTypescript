declare global {
    function setInterval(callback: () => void, ms: number): number;
    function clearInterval(intervalId: number): void;
    function setTimeout(callback: () => void, ms: number): number;
    
    const process: NodeJS.Process;
}

export {};