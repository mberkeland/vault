/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
const ver = '2.15';
const DEBUG = false;
const LOCAL = false;
import React, {useState, useEffect} from 'react';
//import {AudioDeviceInfo, AudioManager} from 'react-native-audio-api';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ImageBackground,
  Pressable,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Button,
  ActivityIndicator,
  NativeModules,
  Dimensions,
  NativeEventEmitter,
} from 'react-native';
import {
  Pusher,
  PusherMember,
  PusherChannel,
  PusherEvent,
} from '@pusher/pusher-websocket-react-native';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import {styles} from './styles';
import {FraudCheck} from '../components/fraudcheck';
import parsePhoneNumber, {CountryCode} from 'libphonenumber-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhoneInput from 'react-native-phone-number-input';
import {getUniqueId} from 'react-native-device-info';
import {WebView} from 'react-native-webview';
import Modal from 'react-native-modal';
import dgram from 'react-native-udp';
import GetLocation from 'react-native-get-location';
import Video from 'react-native-video';
import vvideo from '../images/vault.mp4';
import rvideo from '../images/tluav.mp4';
import tvideo from '../images/TBVault.mp4';
import tvideof from '../images/TBVaultFail.mp4';
import bedimage from '../images/bedrock.jpg';
import {request, requestMultiple, PERMISSIONS} from 'react-native-permissions';
import Sound from 'react-native-sound';
import {SelectCountry} from 'react-native-element-dropdown';

var languages = [
  {
    value: 'en',
    lable: 'English',
  },
  {
    value: 'es',
    lable: 'Spanish',
  },
  {
    value: 'fr',
    lable: 'French',
  },
  {
    value: 'it',
    lable: 'Italian',
  },
  {
    value: 'de',
    lable: 'German',
  },
  {
    value: 'pt',
    lable: 'Portuguese',
  },
  {
    value: 'hi',
    lable: 'Hindi',
  },
];
const eventEmitter = new NativeEventEmitter(NativeModules.EventEmitter);
const {VonageVerifySilentAuthModule, ClientManager} = NativeModules;
const pusher = Pusher.getInstance();
var channel = null;
var phone = '14083753079';
var started = null;
var gPhone;
var gFailure;
var vUrl = DEBUG
  ? 'https://neru-ef3346a6-debug-vault.use1.runtime.vonage.cloud'
  : 'https://neru-ef3346a6-vault-vault.use1.runtime.vonage.cloud';
var phase = 0;
var faceUrl = 'https://main.d3sn8is0cbxe5o.amplifyapp.com';
var udpUrl = '10.47.111.20';
var udpPort = 50000;
var bcolor = '#42084e'; //'#ECFFDC';
var endVideo = tvideo;
const filex = require('../images/redx2.gif');
const fileq = require('../images/qmark.png');
const filec = require('../images/greencheck1.gif');
const fileu = require('../images/unused.png');
const filee = require('../images/exclamation.png');
const filel = require('../images/loading.gif');
var deviceId;
var myLoc;
var gcallto = 30;
var bedrock =
  'Warning!\n\nBack-end AI processing indicates fraud pattern; this transaction halted.';
getUniqueId().then(id => {
  deviceId = id;
  console.log('Initialized deviceId: ', deviceId);
});
var sessionId = '';
type SectionProps = PropsWithChildren<{
  title: string;
}>;
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}
function hello() {
  console.log('Playing hello sound from ', Sound.MAIN_BUNDLE);
  const sound = new Sound('hablame.wav', Sound.MAIN_BUNDLE, error => {
    if (error) {
      console.log('failed to load the sound', error);
      return;
    }
    // Enable the speakerphone
    sound.setSpeakerphoneOn(true); // pass true or false
    sound.play(success => {
      if (success) {
        console.log('successfully finished playing');
      } else {
        console.log('playback failed due to audio decoding errors');
      }
    });
  });
}

function MainScreen(): React.JSX.Element {
  const isDarkMode = false; //useColorScheme() === 'dark';
  const doDebug = async inp => {
    //console.log('Inp: ', inp);
    let body = inp;
    body.product = 'vault';
    if (typeof inp === 'string') {
      console.log('Stringifying debug');
      body = {debug: inp};
    }
    body.version = '' + ver;
    body.phone = '' + gPhone;
    //console.log('Debug: ', body);
    try {
      fetch('https://vids.vonage.com/vfraud/debugNV', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.log('Error sending to debug server:', err);
    }
  };
  const backgroundStyle = {
    backgroundColor: showVideo ? '#42084e' : Colors.lighter,
    //    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter, lightgreen
  };
  const Header = ({onData}): Node => {
    const isDarkMode = false; // useColorScheme() === 'dark';
    return (
      <View>
        <Text
          style={[
            styles.text,
            {
              marginTop: 40,
              color: Colors.white,
            },
          ]}>
          Trusted Bank
        </Text>
        <Image
          style={{width: 150, height: 150, marginLeft: 20, marginTop: 20}}
          source={
            skin === 'vault'
              ? require('../images/vonage_logo.png')
              : require('../images/TBLogo-B.png')
          }></Image>
      </View>
    );
  };
  const [checked, setChecked] = useState<boolean>(false);
  const [isPhoneNumberValidState, setIsPhoneNumberValidState] = useState(false);
  const [inputNumber, setInputNumber] = useState(null);
  const [countryCode, setCountryCode] = useState(null);
  const [inProcess, setInProcess] = useState(false);
  const [facial, setFacial] = useState(false);
  const [settings, setSettings] = useState(false);
  const [fast, setFast] = useState(true);
  const [demo, setDemo] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [popup, setPopup] = useState(false);
  const [state, alterState] = useState(null);
  const [done, setDone] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [warning, setWarning] = useState(false);
  const [splash, setSplash] = useState(false);
  const [light, setLight] = useState(true);
  const [skin, setSkin] = useState('vault');
  const [cbutton, setCbutton] = useState('Call Trusted Bank');
  const [inCall, setInCall] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [startsplash, setStartSplash] = useState(false);
  const [failure, setFailure] = useState(false);
  const [front, setFront] = useState(true);
  const [deeper, setDeeper] = useState(false);
  const [lang, setLang] = useState('en');
  console.log('Render with state: ', state, 'failure: ', failure);
  // the required distance between touchStart and touchEnd to be detected as a swipe
  const minSwipeDistance = 265;

  const onTouchStart = e => {
    //    e.preventDefault();
    console.log(
      'start: ',
      e.nativeEvent.locationX,
      Dimensions.get('window').width,
    );
    //setTouchEnd(null); // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.nativeEvent.locationX);
  };
  const onTouchMove = e => setTouchEnd(e.nativeEvent.locationX);
  const onTouchEnd = e => {
    var end = e.nativeEvent.locationX;
    console.log('onTouchEnd: ', touchStart, end);
    if (!touchStart) return;
    const distance = touchStart - end;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe) {
      console.log('swipe left: ', distance);
      setWarning(true);
      // add your conditional logic here
    }
  };

  var preFacial = false;

  var delay = 1000;

  const stopFacial = () => {
    console.log('stopFacial, state: ', state);
    onMessage('cancelled:0:55');
  };

  async function startup() {
    await AsyncStorage.getItem('@skin').then(value => {
      console.log('Retrieved previous skin: ', value);
      setSkin(value);
      if (value === 'bank') {
        endVideo = tvideo;
      }
    });

    const resp = await fetch(`https://vids.vonage.com/vfraud/redirector`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({phone: '' + gPhone, product: 'vault'}),
    });
    var data = await resp.json();
    console.log('Response from Initial Redirector: ', data);
    if (data.baseUrl) {
      ////////////////////////// Note: uncomment for RELEASE version!!!!
      if (!DEBUG) {
        vUrl = data.baseUrl;
      }
      AsyncStorage.setItem('@vUrl', vUrl);
    }
    if (data.udp) {
      udpUrl = data.udp;
      AsyncStorage.setItem('@udpUrl', udpUrl);
    }
    if (data.udpport) {
      udpPort = data.udpport;
      AsyncStorage.setItem('@udpPort', udpPort);
    }
    if (data.skin) {
      setSkin(data.skin);
      if (data.skin === 'bank') {
        endVideo = tvideo;
      }
      AsyncStorage.setItem('@skin', data.skin);
      console.log('Setting retrieved skin: ', data.skin);
    }
    if (data.prompt) {
      gcallto = data.prompt;
      AsyncStorage.setItem('@callto', gcallto);
    }
    if (data.languages) {
      languages = data.languages;
    }
  }
  function updateStatus(index, results, desc = '') {
    var status = -1;
    var file = fileq;
    var description = desc;
    if (!description.length) description = results;
    console.log('Setting results ', results, index);
    if (results == 'allow') {
      status = 1;
      file = filec;
    } else if (results == 'block') {
      status = 0;
      file = filex;
    } else if (results == 'unused') {
      console.log('Setting unused');
      status = -3;
      file = fileu;
    } else if (results == 'checking') {
      console.log('Setting checking');
      status = -4;
      file = filel;
    } else if (results == 'warning') {
      status = -2;
      file = filee;
    } else {
      status = -1;
      file = fileq;
    }
    var obj = tasks[index];
    obj.results = results;
    obj.desc = description;
    obj.status = status;
    obj.deviceId = deviceId;
    obj.phone = '' + gPhone;
    obj.sessionId = sessionId;
    sendResults(obj);
    const newTasks = tasks.map((c, i) => {
      if (i === index) {
        c.status = status;
        c.desc = description;
        c.icon = file;
        return c;
      } else {
        // The rest haven't changed
        return c;
      }
    });
    setTasks(newTasks);
  }
  async function sendCode(code, reqId) {
    const resp = fetch(vUrl + '/checkcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({code: code, reqId: reqId}),
    });
  }
  async function sendResults(obj) {
    const resp = fetch(vUrl + '/stepResults', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(obj),
    });
  }
  async function doCall(jwt, callto) {
    if (LOCAL) return;
    console.log('In doCall with ', jwt, callto);
    if (!isConnected) {
      await ClientManager.login(jwt);
    } else {
      if (!LOCAL && !inCall) {
        //ClientManager.setCommunicationDevices();
        const callId = ClientManager.makeCall(gcallto);
        console.log('CallId 2: ', callId);
        //playVideo();
        updateStatus(0, 'allow', 'In Call');
      }
    }
  }
  async function getStep(index) {
    let body = {
      phone: '' + gPhone,
      product: 'vault',
      id: deviceId,
      sandbox: sandbox,
      demo: demo,
    };
    if (index == null || !tasks[index].active) {
      console.log('Not using ', index);
      updateStatus(index, 'unused', 'Unused');
      return;
    }
    var data;
    console.log('in getStep for index ', index, demo);
    updateStatus(index, 'checking');

    if (index == 0 || tasks[index].tag == 'location') {
      console.log('Adding location to request body: ', myLoc);
      body.location = myLoc;
      var methods = [];
      if (!index) {
        tasks.map(task => {
          if (task.id && task.active) {
            methods.push(task.name.replace('\n', ' '));
          }
        });
        body.methods = methods;
        body.lang = lang;
      }
    }
    if (!demo || tasks[index].tag == 'ai') {
      if (sandbox && tasks[index].tag == 'nv') {
        body.phone = '990' + gPhone.substring(gPhone.length - 10);
      }
      if (tasks[index].tag == 'nv')
        console.log(
          'Will I be forcing failure for Silent Auth? : ',
          failure,
          gFailure,
          tasks[index].tag,
        );
      if (gFailure && tasks[index].tag == 'nv') {
        await sleep(delay);
        updateStatus(index, 'block', 'Unable to verify');
        return;
      } else {
        const resp = await fetch(vUrl + tasks[index].url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        console.log('resp back in getStep index ', index);
        data = await resp.json();
      }
      console.log('Response from getStep: ', data);
      if (data.jwt) {
        console.log('Making call with JWT and callto: ', gcallto);
        // This is for the AI Phone Call Assistant, data.jwt and data.callto were returned
        //        gcallto = data.callto;
        if (!channel) {
          console.log('No channel yet, initializing Pusher');
          await initPusher(data.pkey);
        }
        console.log('Updating call status: ', index, 'allow', 'Calling');
        updateStatus(index, 'allow', 'Calling');
        var callid = await doCall(data.jwt, gcallto);
        return;
      }
      if (data.redirect) {
        // This is for Silent Auth
        var reqId = data.reqid;
        console.log('Ok, doing redirection to ', data.redirect);
        try {
          const jopenCheckResponse =
            await VonageVerifySilentAuthModule.openWithDataCellular(
              data.redirect,
              true,
            );
          const openCheckResponse = JSON.parse(jopenCheckResponse);
          //console.log('Redirect response: ', openCheckResponse);
          doDebug({type: 'checkResponse', checkResponse: openCheckResponse});
          if (openCheckResponse.http_status > 299) {
            updateStatus(index, 'block', 'Invalid number');
          } else if (openCheckResponse.response_body?.code) {
            // Must be SA
            updateStatus(index, 'allow', 'Number verified');
            sendCode(openCheckResponse.response_body.code, reqId);
          } else if (
            typeof openCheckResponse.response_body === 'object' &&
            openCheckResponse.response_body !== null
          ) {
            // Must be NV
            console.log('NV Response body: ', openCheckResponse.response_body);
            if (openCheckResponse.response_body.results) {
              updateStatus(index, 'allow', 'Number verified');
            } else {
              updateStatus(index, 'block', 'Invalid number');
            }
          }
        } catch (err) {
          updateStatus(index, 'block', 'Unable to verify');
          console.log('Redirection error: ' + err);
          doDebug({type: 'checkResponseErrorCatch', err: err, errno: '' + err});
        }
        return;
      }
      if (data.results) {
        updateStatus(index, data.results, data.results);
      }
    } else {
      // Demo mode
      await sleep(delay);
      console.log('Demo mode for ', index);
      if (gFailure && tasks[index].tag == 'nv') {
        await sleep(delay);
        updateStatus(index, 'block', 'Unable to verify');
        return;
      }
      updateStatus(index, 'allow', 'allow');
    }
  }
  function playVideo() {
    setStartSplash(true);
    /*
    setTimeout(() => {
      setStartSplash(false);
    }, 8200);
    */
  }
  async function getNumber() {
    await AsyncStorage.getItem('@phone').then(myPhone => {
      var iNumber = myPhone;
      gPhone = myPhone;
      console.log('Getting from async storage: ', myPhone);
      if (!myPhone) myPhone = ''; //"+14085551212";
      console.log('Adjusted after async storage: ', myPhone);
      const phoneNumber = parsePhoneNumber(myPhone);
      console.log('gv Validating: ', phoneNumber?.nationalNumber);
      if (phoneNumber?.nationalNumber) {
        iNumber = phoneNumber.nationalNumber;
      }
      if (phoneNumber?.country) {
        cC = phoneNumber.country;
      } else {
        cC = 'US';
      }
      console.log('Country and Number: ', cC, iNumber);
      setInputNumber(iNumber);
      setCountryCode(cC);
    });
    started = true;
    startup();
  }
  if (!started) {
    getNumber();
  }
  const handleCheckboxPress = () => {
    setChecked(prev => {
      return !prev;
    });
  };
  async function initPusher(key) {
    console.log('Initializing Pusher for deviceId: ', deviceId);
    await pusher.init({
      apiKey: key,
      cluster: 'us3',
    });
    channel = await pusher.subscribe({
      channelName: 'vault-' + deviceId,
      onEvent: event => {
        console.log('raw event data: ', event);
        const data = JSON.parse(event.data);
        //var data = event.data;
        console.log(`Got channel event data:`, data);
        if (data) {
          console.log('event data sessionId: ', data.sessionId, data.uuid);
          sessionId = data.sessionId;
          console.log('Got sessionId: ', sessionId);
        }
        if (data.action == 'authenticate') {
          //event.eventName ===
          console.log('Got authenticate event, starting looper ');
          looper();
        }
      },
    });
    await pusher.connect();
    console.log('Done setting up pusher');
  }
  var defaultTasks = [
    /*
    {
      id: 0,
      tag: 'fd',
      name: 'Fraud\nDefender',
      desc: '',
      tech: 'Vonage API',
      prompt:
        'Using Vonage Fraud APIs to check for likely fraudulent numbers',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getFd',
      icon: fileq,
    },
    */
    /*
    {
      id: 1,
      tag: 'fraud',
      name: 'Number\nFraud',
      desc: '',
      tech: 'Vonage API',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getFraud',
    },
    */
    {
      id: 0,
      tag: 'ai',
      name: 'AI\nAssistant',
      desc: '',
      tech: 'Vonage API',
      prompt: 'Call the Vault AI Assistant',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getAi',
      icon: fileq,
    },
    {
      id: 1,
      tag: 'simswap',
      name: 'SIM\nSwap',
      desc: '',
      tech: 'Network API',
      prompt: 'Checking to see if number recently moved to another SIM',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getSimswap',
      icon: fileq,
    },
    {
      id: 2,
      tag: 'nv',
      name: 'Silent\nAuthentication',
      desc: '',
      tech: 'Network API',
      prompt: 'Silently verifying that this phone is the number expected',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getNv',
      icon: fileq,
    },
    {
      id: 3,
      tag: 'location',
      name: 'Device\nLocation',
      desc: '',
      tech: 'Network API',
      prompt: 'Checking to see that the phone is in the location expected',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getLocation',
      icon: fileq,
    },
    {
      id: 4,
      tag: 'fd',
      name: 'Fraud\nDefender',
      desc: '',
      tech: 'Vonage API',
      prompt: 'Using Vonage Fraud APIs to check for likely fraudulent numbers',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getFd',
      icon: fileq,
    },

    /*    {
      id: 4,
      tag: 'facial',
      name: 'Facial\nLiveness',
      desc: '',
      tech: 'Amazon API',
      prompt: 'Checking ‘Facial Liveness’ to prevent pictures or AI bots',
      active: false,
      live: true,
      status: '-1',
      results: '',
      url: '/getFacial',
      icon: fileq,
    },
*/
  ];
  var copyTasks = [...defaultTasks];
  const [tasks, setTasks] = useState(copyTasks);
  useEffect(() => {
    async function fetchSettings() {
      var val;
      val = await AsyncStorage.getItem('fast');
      if (1 || val == 'true') {
        // Default is false, so only change if we read true
        setFast(true);
      }
      val = await AsyncStorage.getItem('demo');
      if (val == 'true') {
        setDemo(true);
      }
      val = await AsyncStorage.getItem('sandbox');
      if (val === 'true') {
        setSandbox(true);
      }
      val = await AsyncStorage.getItem('failure');
      if (val === 'true') {
        setFailure(true);
        console.log('Initial setting of failure to true from async storage');
        gFailure = true;
      }
      val = await AsyncStorage.getItem('light');
      if (val === 'false') {
        setLight(false);
      }
      val = await AsyncStorage.getItem('lang');
      if (val) {
        console.log('Got lang: ', val);
        setLang(val);
      } else {
        console.log('No stored lang, use: ', lang);
      }
      tasks.map(async task => {
        val = await AsyncStorage.getItem(task.tag);
        if (val === 'false') {
          // Default is true, so only change if we read false
          console.log('Setting to false: ', task.tag, typeof val);
          task.active = false;
        }
      });
      try {
        await GetLocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 4000,
        }).then(loc => {
          myLoc = loc;
          console.log('Got location: ', myLoc);
        });
      } catch (err) {
        console.log('Problem getting location: ', err);
      }
    }
    fetchSettings();
    console.log('componentDidMount requesting permissions');
    if (Platform.OS === 'ios') {
      request(PERMISSIONS.IOS.MICROPHONE);
    } else if (Platform.OS === 'android') {
      requestMultiple([
        PERMISSIONS.ANDROID.RECORD_AUDIO,
        PERMISSIONS.ANDROID.READ_PHONE_STATE,
      ]);
      eventEmitter.addListener('onStatusChange', async data => {
        console.log('Got status change event: ', data);
        const status = data.status;
        console.log('Got status change: ', status);
        //this.setState({status: status});

        if (status === 'connected' || status === 'Connected') {
          setIsConnected(true);
          if (!LOCAL && !inCall) {
            const callId = ClientManager.makeCall(gcallto);
            console.log('CallId: ', callId);
            //playVideo();
            updateStatus(0, 'allow', 'In Call');
          }

          //this.setState({button: 'Call'});
          //this.setState({callAction: () => ClientManager.makeCall(number)});
        }
      });
      eventEmitter.addListener('onCallStateChange', data => {
        const state = data.state;
        console.log('Got state change: ', state);
        if (state == 'On Call') {
          console.log('Setting inCall to true');
          setInCall(true);
          setCbutton('End Call');
        } else if (state == 'Idle') {
          console.log('Setting inCall to false');
          setInCall(false);
          setCbutton('Call Trusted Bank');
        }
      });
    }
  }, []);
  useEffect(() => {
    console.log('In useEffect for number stuff: ', inputNumber, countryCode);
    if (!inputNumber || !countryCode) return;
    const phoneNumber = parsePhoneNumber(inputNumber, countryCode);
    console.log('Validating: ', inputNumber, countryCode, phoneNumber);
    if (phoneNumber?.isValid()) {
      var number = phoneNumber.number; //.replace(/\D/g, '');
      gPhone = number;
      console.log('Setting validation true and writing: ', number);
      AsyncStorage.setItem('@phone', number);
      setIsPhoneNumberValidState(true);
    } else {
      console.log('Setting validation false');
      setIsPhoneNumberValidState(false);
    }
  }, [inputNumber, countryCode]);
  useEffect(() => {
    if (!done) {
      return;
    }
    console.log('Done set to true');
    sendUDP();
    setInProcess(false);
    setFacial(false);
    //bcolor ='rgba( 255, 0, 0, 0.4)'; // Failure
    bcolor = '#42084e'; //'#ECFFDC'; // Good
    var good = true;
    tasks.map(task => {
      console.log('Task results: ', task.name, task.results, task.active);
      if (task.active && task.results != 'allow') {
        good = false;
      }
    });
    if (good) {
      endVideo = tvideo;
    } else {
      endVideo = tvideof;
    }
    setShowVideo(true);
    console.log('Show Video set to true');
    var obj = {};
    obj.name = 'Verification';
    obj.results = good ? 'allow' : 'block';
    obj.desc = 'Verified';
    obj.status = '1';
    obj.deviceId = deviceId;
    obj.phone = '' + gPhone;
    obj.sessionId = sessionId;
    sendResults(obj);
  }, [done]);

  useEffect(() => {
    console.log('useEffect for state: ', state, tasks.length);
    if (state == null || !tasks[state]) {
      console.log('Invalid state');
      setInProcess(false);
      if (state == tasks.length && !tasks[state - 1].active) {
        console.log('Last state, unused... close it out');
        setDone(true);
      }
      return;
    }
    async function fetchData(state) {
      await getStep(state);
    }
    if (!preFacial) {
      showDialog();
    }
    if (tasks[state].active) {
      if (tasks[state].tag == 'facial') {
        setFacial(true);
      } else {
        fetchData(state);
      }
    } else {
      tasks[state].icon = fileu;
      console.log('State, active: ', state, tasks[state].active);
    }
  }, [state]);
  const saveSettings = () => {
    setSettings(false);
    console.log('Writing settings to storage: ');
    AsyncStorage.setItem('fast', '' + fast);
    AsyncStorage.setItem('demo', '' + demo);
    AsyncStorage.setItem('sandbox', '' + sandbox);
    AsyncStorage.setItem('light', '' + light);
    AsyncStorage.setItem('failure', '' + failure);
    AsyncStorage.setItem('lang', '' + lang);
    setFailure(failure);
    gFailure = failure;
    AsyncStorage.setItem('sandbox', '' + sandbox);
    tasks.map(task => {
      console.log('Setting: ', task.tag, task.active);
      AsyncStorage.setItem(task.tag, '' + task.active);
    });
  };

  const sendUDP = async () => {
    if (!light) {
      console.log('Not lighting the light...');
      return;
    }
    console.log('Creating UDP socket, sending to ', udpUrl, udpPort);
    const socket = dgram.createSocket({type: 'udp4', debug: true});
    socket.bind();
    socket.once('listening', function () {
      socket.send(
        'lighton',
        undefined,
        undefined,
        parseInt(udpPort),
        udpUrl,
        function (err) {
          if (err) {
            console.log('UDP Error! ', err);
          }
          console.log('UDP Message sent!');
        },
      );
    });
  };
  const showDialog = async () => {
    console.log('showDialog for ', state, tasks.length);
    if (state == null || state >= tasks.length) {
      console.log('Turning off inProcess');
      setInProcess(false);
      return;
    }
    console.log('Not null');
    var name = tasks[state].name.replace(/\n/g, ' ');
    setPopup(true);
    console.log('DoneshowDialog for ', state);
  };
  const looper = async () => {
    var skip = false;
    if (fast) {
      console.log('Starting fast loop');
      for (let step = 1; step < tasks.length; step++) {
        console.log('Loop value: ', step);
        if (tasks[step].tag == 'facial') {
          if (tasks[step].active) {
            console.log('Facial in fast loop');
            skip = true;
            setFacial(true);
          } else {
            updateStatus(step, 'unused');
            sendUDP();
            setInProcess(false);
          }
        } else {
          await getStep(step);
        }
      }
      if (!skip) {
        console.log('Setting done in fast mode');
        setDone(true);
      }
    } else {
      console.log('Altering state: ', state, tasks.length);
      var v = 0;
      alterState(v);
    }
  };
  const goDeeper = async () => {
    if (inCall) {
      console.log('In call, not going deeper');
      return;
    }
    console.log('Going deeper!');
    setDeeper(true);
    loginHandler();
    var timer = 4000;
    if (!tasks[0].active) {
      setDeeper(false);
      setFront(false);
    } else {
      setTimeout(() => {
        setDeeper(false);
        setFront(false);
      }, timer);
    }
  };
  const loginHandler = async () => {
    console.log('Pressed the button');
    /*    if (front && !inCall) {
      console.log('Turning off front splash');
      setTimeout(() => {
        setFront(false);
      }, 1000);
    }
*/
    if (inCall) {
      console.log('In call, so hang up');
      setInCall(false);
      ClientManager.endCall();
      updateStatus(0, 'allow', 'Call Ended');
      setStartSplash(false);
      setFront(true);
      return;
    }
    reset();
    setInProcess(true);
    console.log('After Dialog');
    if (tasks[0].active) {
      // Special case for call first
      await getStep(0);
    } else {
      // No AI call, so Send message to get propagated to GUI...
      console.log('No AI< start web GUI stuff ');
      var obj = tasks[0];
      var methods = [];
      tasks.map(task => {
        if (task.id && task.active) {
          methods.push(task.name.replace('\n', ' '));
        }
      });

      obj.methods = methods;
      //      obj.desc = description;
      //      obj.status = status;
      obj.deviceId = deviceId;
      obj.phone = '' + gPhone;
      obj.sessionId = sessionId;

      sendResults(obj);
      looper();
    }
  };
  const onMessage = data => {
    console.log('WEBVIEW MESSAGE: ', data);
    setFacial(false);
    let step = tasks.length - 1; // Assumes Facial is the last step (for now)
    var res;
    if (data.nativeEvent) {
      res = data.nativeEvent.data.split(':');
    } else {
      res = data.split(':');
    }
    if (!res[2] || (res[2] && res[2] == 0)) {
      res[2] = 50; // No results? default to questionable
    }
    if (res[2] < 35) {
      // Bad face!
      updateStatus(step, 'block', 'Liveness score:\n' + res[2] + '/100');
    } else if (res[2] < 65) {
      // Questionable face
      updateStatus(step, 'warning', 'Liveness score:\n' + res[2] + '/100');
    } else {
      // Good face
      updateStatus(step, 'allow', 'Liveness score:\n' + res[2] + '/100');
    }
    console.log('About to set done to true');
    setDone(true);
  };
  const reset = async (useFront = false) => {
    console.log('Reset!');
    const newTasks = tasks.map((c, i) => {
      c.status = -1;
      c.desc = '';
      return c;
    });
    setStartSplash(false);
    setTasks(newTasks);
    setShowVideo(false);
    setInProcess(false);
    setFacial(false);
    setDone(false);
    setPopup(false);
    setWarning(false);
    preFacial = false;
    alterState(null);
    if (useFront) {
      setFront(true);
    }
    //setFront(true);

    //await AsyncStorage.clear();
  };
  /*
  <ImageBackground
      source={require('../images/TBackground.png')}
      style={[styles.front, {opacity: 1.0, width: '100%', height: '100%'}]}>
*/
  return (
    <SafeAreaView style={[backgroundStyle, {}]}>
      {true && (
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
      )}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{flexGrow: 1}}
        style={[
          {backgroundColor: showVideo ? bcolor : '#42084e'}, //'#DFC5FE'},
          {height: '100%'},
        ]}>
        <ImageBackground
          source={require('../images/TBackground.png')}
          style={[
            //styles.front,
            {flex: 1, width: '100%', height: '100%'},
          ]}>
          {facial ? (
            <View>
              <Modal isVisible={facial}>
                <Button title="Cancel Liveness Check" onPress={stopFacial} />
                <WebView
                  allowsInlineMediaPlayback={true}
                  style={{height: 100}}
                  source={{uri: faceUrl}}
                  onMessage={onMessage}
                />
              </Modal>
            </View>
          ) : null}
          {warning ? (
            <View
              onTouchStart={() => {
                setWarning(false);
              }}>
              <Modal
                style={[styles.settings, {backgroundColor: 'red'}]}
                isVisible={warning}>
                <Video
                  source={TBVaultFail}
                  paused={false}
                  style={[styles.video, {top: -40}]}
                  repeat={false}
                />
                <Text
                  style={[
                    styles.text,
                    {
                      color: 'white',
                    },
                  ]}>
                  {bedrock}
                </Text>
                <Image
                  source={bedimage}
                  style={[
                    styles.video,
                    {width: 200, height: 180, marginTop: 20},
                  ]}></Image>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: 'yellow',
                      marginTop: 70,
                    },
                  ]}>
                  Touch anywhere to dismiss
                </Text>
              </Modal>
            </View>
          ) : null}
          {1 && (
            <View style={{flex: 1}}>
              <Modal
                isVisible={deeper}
                animationOutTiming={1000}
                animationInTiming={1000}>
                <View style={styles.rbutton}>
                  <TouchableOpacity
                    onPress={() => {
                      setDeeper(false);
                    }}>
                    <Text
                      style={[
                        styles.buttonText,
                        {fontSize: 25, textAlign: 'center'},
                      ]}>
                      Let's look closer at what's happening in the background...
                    </Text>
                  </TouchableOpacity>
                </View>
              </Modal>
            </View>
          )}
          {1 && (
            <View
              onTouchStart={() => {
                //setFront(false);
              }}>
              <Modal
                style={[styles.settings, {backgroundColor: 'white', margin: 0}]}
                transparent={true}
                hideModalContentWhileAnimating={true}
                animationOut={'fadeOut'}
                animationIn={'fadeIn'}
                animationOutTiming={1000}
                animationInTiming={1000}
                isVisible={front}>
                <ImageBackground
                  source={require('../images/TBackground.png')}
                  style={styles.front}>
                  <Text
                    style={[
                      styles.text,
                      {
                        fontSize: 40,
                        color: 'white',
                        marginTop: 80,
                      },
                    ]}>
                    Trusted Bank
                  </Text>
                  <Image
                    source={require('../images/TBLogo-B.png')}
                    style={[
                      styles.logo2,
                      {width: 200, height: 180, marginTop: 60, opacity: 1.0},
                    ]}></Image>
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color: 'white',
                        marginTop: 50,
                      },
                    ]}>
                    Call to speak to our agent
                  </Text>
                  <View style={{flexDirection: 'row', marginTop: 20}}>
                    <TouchableOpacity
                      onPress={() => {
                        goDeeper();
                      }}>
                      <Image
                        source={require('../images/phone.png')}
                        style={[
                          styles.logo2,
                          {
                            width: 80,
                            height: 80,
                            marginTop: 80,
                            opacity: 1.0,
                            marginRight: 70,
                          },
                        ]}></Image>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setFront(false);
                      }}>
                      <Image
                        source={require('../images/hangup.png')}
                        style={[
                          styles.smallIcon,
                          {
                            width: 80,
                            height: 80,
                            marginTop: 80,
                            opacity: 1.0,
                          },
                        ]}></Image>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.absoluteSettings}
                    onPress={() => {
                      setSettings(true);
                    }}>
                    <Image
                      style={styles.smallIcon} //{[styles.smallIcon, {marginTop: 70, marginLeft: 300}]}
                      source={require('../images/settingsw.png')}></Image>
                  </TouchableOpacity>
                </ImageBackground>
              </Modal>
            </View>
          )}
          {splash ? (
            <View
              onTouchStart={() => {
                setSplash(false);
              }}>
              <Modal
                style={[styles.settings, {backgroundColor: 'white'}]}
                isVisible={splash}>
                <Image
                  source={require('../images/VonagePOE_Primary.png')}
                  style={[
                    {
                      width: 240,
                      height: 80,
                      marginTop: -120,
                      marginLeft: -150,
                    },
                  ]}></Image>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: 'darkblue',
                      marginTop: 20,
                    },
                  ]}>
                  Built with our partners
                </Text>
                <Image
                  source={require('../images/tef.png')}
                  style={[
                    styles.video,
                    {width: 340, height: 80, marginTop: 40},
                  ]}></Image>
                <Image
                  source={require('../images/aduna2.png')}
                  style={[
                    styles.video,
                    {width: 300, height: 100, marginTop: 20},
                  ]}></Image>
                <Image
                  source={require('../images/awspartner.png')}
                  style={[
                    styles.video,
                    {width: 200, height: 150, marginTop: 20},
                  ]}></Image>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: 'darkblue',
                      marginTop: 70,
                    },
                  ]}>
                  Touch anywhere to dismiss
                </Text>
              </Modal>
            </View>
          ) : null}
          {popup ? (
            <View>
              <Modal
                style={[styles.settings]}
                transparent={false}
                isVisible={popup}>
                <View style={styles.container}>
                  <Text style={[styles.techtext]}>{tasks[state].tech}</Text>
                  <Text
                    style={[
                      styles.text,
                      {
                        color: isDarkMode ? Colors.white : Colors.black,
                      },
                    ]}>
                    {tasks[state].name.replace(/\n/g, ' ')}
                  </Text>
                  <Text
                    style={[
                      styles.subtext,
                      {
                        color: isDarkMode ? Colors.white : Colors.black,
                      },
                    ]}>
                    {'\n'}
                    {tasks[state].prompt}
                    {'\n\n'}
                  </Text>
                  <Text
                    style={[
                      styles.text,
                      {
                        color: isDarkMode ? Colors.white : Colors.black,
                      },
                    ]}>
                    Result:
                    {'\n'}
                  </Text>
                  {tasks[state].status == -4 ? (
                    <View style={styles.icon}>
                      <ActivityIndicator color={'blue'} size="large" />
                    </View>
                  ) : (
                    <Image
                      source={tasks[state].icon}
                      style={styles.icon}></Image>
                  )}
                  <Text
                    style={[
                      styles.text,
                      {
                        color: isDarkMode ? Colors.white : Colors.black,
                      },
                    ]}>
                    {tasks[state].desc}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      var final = state + 1;
                      for (let i = state + 1; i < tasks.length; i++) {
                        if (tasks[i] && tasks[i].active) {
                          console.log('Got i: ', i);
                          final = i;
                          if (tasks[i].tag == 'facial') {
                            preFacial = true;
                          }
                          break;
                        } else {
                          updateStatus(i, 'unused');
                          console.log('Unusing ', i);
                        }
                      }
                      alterState(final);
                      setPopup(false);
                    }}
                    style={[styles.button, styles.enabledButton]}>
                    <Text style={styles.buttonText}>Continue</Text>
                  </TouchableOpacity>
                </View>
                <View>
                  <TouchableOpacity onPress={reset}>
                    <Image
                      style={[
                        styles.smallIcon,
                        {marginRight: 0, marginLeft: '90%'},
                      ]}
                      source={require('../images/cancel.png')}></Image>
                  </TouchableOpacity>
                </View>
              </Modal>
            </View>
          ) : null}
          {settings ? (
            <View>
              <Modal
                style={[styles.settings]}
                transparent={false}
                isVisible={settings}>
                <Text style={[styles.absoluteText, {color: 'black'}]}>
                  v{ver}
                </Text>
                <Text
                  style={[
                    styles.text,
                    {
                      color: isDarkMode ? Colors.white : Colors.black,
                    },
                  ]}>
                  Settings
                </Text>
                <View style={{height: 180}}>
                  {countryCode ? (
                    <PhoneInput
                      containerStyle={[styles.phone]}
                      defaultValue={inputNumber} //defaultNumber}
                      defaultCode={countryCode} //global.myCountry}
                      textInputProps={{returnKeyType: 'done'}}
                      onChangeText={text => {
                        console.log('onChangeText: ', text);
                        setInputNumber(text);
                      }}
                      onChangeFormattedText={text => {
                        //console.log("onChangeFormattedText: ", text)
                        //setInputNumber(text);
                      }}
                      onChangeCountry={text => {
                        setCountryCode(text.cca2);
                      }}
                      withDarkTheme
                      withShadow
                    />
                  ) : null}
                  {lang ? (
                    <SelectCountry
                      style={styles.dropdown}
                      selectedTextStyle={styles.selectedTextStyle}
                      placeholderStyle={styles.placeholderStyle}
                      imageStyle={styles.imageStyle}
                      iconStyle={styles.iconStyle}
                      maxHeight={500}
                      value={lang}
                      data={languages}
                      valueField="value"
                      labelField="lable"
                      placeholder="Language"
                      searchPlaceholder="Search..."
                      onChange={e => {
                        console.log('Setting lang: ', e.value);
                        setLang(e.value);
                        AsyncStorage.setItem('lang', '' + lang);
                      }}
                    />
                  ) : null}
                </View>
                {0 ? (
                  <BouncyCheckbox
                    key={-1}
                    size={30}
                    text={'Use Fast Mode'}
                    isChecked={fast}
                    innerIconStyle={{borderWidth: 4}}
                    textStyle={{
                      textDecorationLine: 'none',
                      fontSize: 30,
                    }}
                    style={{
                      width: '90%',
                      marginTop: 20,
                      marginLeft: -10,
                    }}
                    onPress={(isChecked: boolean) => {
                      setFast(isChecked);
                    }}
                  />
                ) : null}
                <BouncyCheckbox
                  key={-2}
                  size={30}
                  text={'Demo Mode'}
                  isChecked={demo}
                  innerIconStyle={{borderWidth: 4}}
                  textStyle={{
                    textDecorationLine: 'none',
                    fontSize: 30,
                  }}
                  style={{
                    width: '90%',
                    marginTop: 10,
                    marginLeft: -10,
                  }}
                  onPress={(isChecked: boolean) => {
                    setDemo(isChecked);
                    if (isChecked) {
                      setSandbox(false);
                    }
                  }}
                />
                {
                  <BouncyCheckbox
                    key={-3}
                    size={30}
                    text={'Fail Silent Auth'}
                    isChecked={failure}
                    innerIconStyle={{borderWidth: 4}}
                    textStyle={{
                      textDecorationLine: 'none',
                      fontSize: 30,
                    }}
                    style={{
                      width: '90%',
                      marginTop: 10,
                      marginLeft: -10,
                    }}
                    onPress={(isChecked: boolean) => {
                      console.log('Setting failure in gui to ', isChecked);
                      setFailure(isChecked);
                      gFailure = isChecked;
                    }}
                  />
                }
                {0 ? (
                  <BouncyCheckbox
                    key={-4}
                    size={30}
                    text={'Light the Light'}
                    isChecked={light}
                    innerIconStyle={{borderWidth: 4}}
                    textStyle={{
                      textDecorationLine: 'none',
                      fontSize: 30,
                    }}
                    style={{
                      width: '90%',
                      marginTop: 10,
                      marginBottom: 10,
                      marginLeft: -10,
                    }}
                    onPress={(isChecked: boolean) => {
                      setLight(isChecked);
                    }}
                  />
                ) : null}
                {tasks.map(task => {
                  var name = task.name.replace(/\n/g, ' ');
                  return (
                    <View>
                      <BouncyCheckbox
                        key={task.id}
                        size={25}
                        text={'Use ' + name}
                        isChecked={task.active}
                        innerIconStyle={{borderWidth: 4}}
                        textStyle={{
                          textDecorationLine: 'none',
                          fontSize: 25,
                        }}
                        style={{width: '90%', marginTop: 16, marginLeft: 20}}
                        onPress={(isChecked: boolean) => {
                          task.active = isChecked;
                        }}></BouncyCheckbox>
                    </View>
                  );
                })}
                <View style={{width: 100, marginTop: 30}}>
                  <Button
                    title="Done"
                    onPress={() => {
                      saveSettings();
                    }}
                  />
                </View>
              </Modal>
            </View>
          ) : null}
          {startsplash || showVideo ? (
            <View
              style={[
                styles.container,
                {
                  backgroundColor: isDarkMode ? Colors.black : '',
                },
              ]}>
              <Video
                source={endVideo}
                paused={false}
                style={styles.video}
                repeat={false}
              />
            </View>
          ) : (
            <View
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              style={[
                styles.container,
                {
                  backgroundColor: isDarkMode ? Colors.black : '',
                },
              ]}>
              <Header
                onData={() => {
                  console.log('Splashing');
                  setSplash(true);
                }}
              />
            </View>
          )}
          <View
            style={[
              styles.container,
              {
                backgroundColor: isDarkMode ? Colors.black : '',
              },
            ]}>
            <TouchableOpacity
              onPress={loginHandler}
              style={[
                styles.button,
                isPhoneNumberValidState && !inProcess
                  ? styles.enabledButton
                  : styles.disabledButton,
              ]}
              disabled={!isPhoneNumberValidState}>
              {skin === 'vault' ? (
                <Text style={styles.buttonText}>Enter the Vault</Text>
              ) : (
                <Text style={styles.buttonText}>{cbutton}</Text>
              )}
            </TouchableOpacity>
          </View>
          <View
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={[
              styles.citem,
              {
                backgroundColor: isDarkMode ? Colors.black : '',
              },
            ]}>
            {tasks.map(task => {
              //if (task && task.active) console.log('Mapped Task: ', task);
              if (task && task.active)
                return (
                  <Section key={100 + task.id}>
                    <FraudCheck
                      value={task.status}
                      title={task.name}
                      description={task.id ? task.desc : ''}
                    />
                  </Section>
                );
            })}
          </View>
          <View
            style={[
              styles.container,
              styles.buttonContainer,
              {
                backgroundColor: isDarkMode ? Colors.black : '',
              },
            ]}>
            <TouchableOpacity onPress={() => reset(true)}>
              <Image
                style={[styles.smallIcon, {width: 40}]}
                source={require('../images/resetw.png')}></Image>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSettings(true);
              }}>
              <Image
                style={[styles.smallIcon]}
                source={require('../images/settingsw.png')}></Image>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}
export default MainScreen;
