import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@lottiefiles/react-lottie-player';
import { getToken } from '../services/livekitService';
import { updatePlayerState } from '../services/firestoreService';
import { BubbleChart } from './BubbleChart';
import { VideoEmitter } from './VideoEmitter';
import player_pinata from '../assets/player_pinata.webp';
import { connectMQTT } from '../services/mqttService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'

export const Controls = ({ username }) => {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [pointPos, setPointPos] = useState({ x: 0, y: 0 });
    const [mqttClient, setMqttClient] = useState(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [mqttConnected, setMqttConnected] = useState(false);  // Estado para conexión MQTT

    const location = useLocation();
    const navigate = useNavigate();
    const { role } = location.state || {};

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const newToken = await getToken(`${username}-controller`);
                setToken(newToken);
                setLoading(false);
            } catch (error) {
                console.error('Error al obtener token:', error);
                setError(true);
                setLoading(false);
            }
        };

        fetchToken();
    }, [username]);

    useEffect(() => {
        const setupMqttClient = () => {
            console.log('Attempting to connect MQTT...');
            connectMQTT(
                (client) => {
                    console.log('MQTT client connected successfully');
                    setMqttClient(client);
                    setMqttConnected(true);  // Indica que MQTT está conectado
                },
                (err) => {
                    console.error('MQTT connection failed', err);
                    setMqttClient(null);
                    setMqttConnected(false);  // Indica que MQTT no está conectado
                }
            );
        };
    
        setupMqttClient();
    }, []);

    useEffect(() => {
        if (isPublishing && mqttClient) {
            const data = `${pointPos.x.toFixed(0)},${pointPos.y.toFixed(0)}`;
            mqttClient.publish("FAB24/test", data, {}, (err) => {
                if (err) {
                    console.error('Failed to publish message:', err);
                } else {
                    console.log(`Published: ${data}`);
                }
            });
        }
    }, [isPublishing, pointPos]);

    const handleExitGame = async () => {
        await updatePlayerState('p1', false);

        if (mqttClient) {
            mqttClient.end();
        }
        navigate('/');
    };

    const handleHandDetected = (point) => {
        setPointPos(point);
        console.log(`isPublishing: ${isPublishing}, mqttClient: ${mqttClient}`);
    };

    const togglePublishing = () => {
        setIsPublishing((prev) => !prev);
        console.log(`isPublishing toggled to: ${!isPublishing}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Player
                    autoplay
                    loop
                    src='https://lottie.host/f4cbf879-68e9-4d35-b327-7714ecd51b2c/LUAqjYbmxM.json'
                    className="player"
                />
            </div>
        );
    }

    if (error) {
        return <div>Error loading data</div>;
    }

    return (
        <div className="flex flex-col pt-20 min-h-screen">
            <h1 className="text-3xl font-bold mb-10 text-center">#Piñatazostime</h1>
            <div className="flex justify-center mb-4">
                {/* Indicador de estado MQTT */}
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${mqttConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected'}</span>
                </div>
                {/* Indicador de estado de publicación */}
                <div className="flex items-center space-x-2 ml-4">
                    <div className={`w-3 h-3 rounded-full ${isPublishing ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span>{isPublishing ? 'Publishing' : 'Not Publishing'}</span>
                </div>
            </div>
            <div className="flex flex-row mx-8">
                <div className="basis-3/4 mx-8">
                    <div className="flex justify-between mb-4">
                        <h1 className="text-2xl font-bold">Control camera</h1>
                        <button
                            className="bg-red-500 text-white px-10 py-2 rounded-full"
                            onClick={handleExitGame}
                        >
                            <FontAwesomeIcon icon={faArrowRightFromBracket} />  Exit Game
                        </button>
                    </div>
                    <div className="flex">
                        <VideoEmitter token={token} onHandDetected={handleHandDetected} />
                    </div>
                </div>
                <div className="basis-1/4 mx-8">
                    <div className="flex flex-col mb-4">
                        <h1 className="text-2xl font-bold">Control pos</h1>
                        <BubbleChart pointPos={pointPos} />
                    </div>
                    <div className="flex flex-col mb-4">
                        <h1 className="text-2xl font-bold">Pinata control</h1>
                        <div className="flex justify-center">
                            <img
                                className="border border-violet-600 rounded-lg"
                                src={player_pinata}
                                alt="Player control"
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <p className="text-center text-lg font-bold">
                            You are playing as: {role}
                        </p>
                    </div>
                    <div className="flex justify-center mt-4">
                        <button
                            className={`px-4 py-2 rounded-full ${isPublishing ? 'bg-green-500' : 'bg-blue-500'} text-white`}
                            onClick={togglePublishing}
                        >
                            {isPublishing ? 'Stop Publishing' : 'Start Publishing'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
