/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
const ver = '1.06';

import React, {useState, useEffect} from 'react';
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
} from 'react-native';

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
import bedimage from '../images/bedrock.jpg';

const {VonageVerifySilentAuthModule} = NativeModules;

var phone = '14083753079';
var started = null;
var gPhone;
var vUrl = 'https://neru-ef3346a6-debug-vault.use1.runtime.vonage.cloud';
var phase = 0;
var faceUrl = 'https://main.d3sn8is0cbxe5o.amplifyapp.com';
var udpUrl = vUrl;
var udpPort = 41234;
var bcolor = '#ECFFDC';
var endVideo = vvideo;
const filex = require('../images/redx2.gif');
const fileq = require('../images/qmark.png');
const filec = require('../images/greencheck1.gif');
const fileu = require('../images/unused.png');
const filee = require('../images/exclamation.png');
const filel = require('../images/loading.gif');
var deviceId;
var myLoc;
var bedrock =
  'Warning!\n\nDue to unacceptable authorization checks, this transaction will not proceed.';
getUniqueId().then(id => {
  deviceId = id;
  console.log('Initialized deviceId: ', deviceId);
});

type SectionProps = PropsWithChildren<{
  title: string;
}>;
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const Header = ({onData}): Node => {
  const isDarkMode = false; // useColorScheme() === 'dark';
  return (
    <ImageBackground
      accessibilityRole="image"
      testID="new-app-screen-header"
      source={require('../images/vonage_logo.png')}
      style={[
        styles.background,
        {
          backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
        },
      ]}
      imageStyle={styles.logo}>
      <Text
        style={[
          styles.text,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        The Vonage
        {'\n'}
        Vault
      </Text>
      <Text
        onPress={(e) => {
          e.preventDefault();
          console.log("Splashing?")
          onData(true)}}
        style={[
          styles.ver,
          {
            color: isDarkMode ? Colors.white : Colors.black,
            textDecorationLine: 'underline',
            fontWeight: 'bold',
          },
        ]}>
        v{ver}
      </Text>
    </ImageBackground>
  );
};

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
function MainScreen(): React.JSX.Element {
  const isDarkMode = false; //useColorScheme() === 'dark';
  const doDebug = async inp => {
    console.log('Inp: ', inp);
    let body = inp;
    body.product = 'vault';
    if (typeof inp === 'string') {
      console.log('Stringifying debug');
      body = {debug: inp};
    }
    body.version = '' + ver;
    body.phone = '' + gPhone;
    console.log('Debug: ', body);
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
    backgroundColor: showVideo ? 'lightgreen' : Colors.lighter,
    //    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter, lightgreen
  };
  const [checked, setChecked] = useState<boolean>(false);
  const [isPhoneNumberValidState, setIsPhoneNumberValidState] = useState(false);
  const [inputNumber, setInputNumber] = useState(null);
  const [countryCode, setCountryCode] = useState(null);
  const [inProcess, setInProcess] = useState(false);
  const [facial, setFacial] = useState(false);
  const [settings, setSettings] = useState(false);
  const [fast, setFast] = useState(false);
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
      vUrl = data.baseUrl;
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
  }
  function updateStatus(index, results, desc = '') {
    var status = -1;
    var file = fileq;
    var description = desc;
    if (!description.length) description = results;
    console.log('Setting results ', results);
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
  async function getFd(index) {
    if (index == null || !tasks[index].active) {
      console.log('Not using ', index);
      updateStatus(index, 'unused', 'Unused');
      return;
    }
    var data;
    console.log('in getFd for index ', index, demo);
    updateStatus(index, 'checking');

    let body = {
      phone: '' + gPhone,
      product: 'vault',
      id: deviceId,
      sandbox: sandbox,
      demo: demo,
    };
    if (tasks[index].tag == 'location') {
      console.log('Adding location to request body: ', myLoc);
      body.location = myLoc;
    }
    if (!demo) {
      if (sandbox && tasks[index].tag == 'nv') {
        body.phone = '990' + gPhone.substring(gPhone.length - 10);
      }
      const resp = await fetch(vUrl + tasks[index].url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      console.log('resp back in getFd index ', index);
      data = await resp.json();
      console.log('Response from getFd: ', data);
      if (data.redirect) {
        var reqId = data.reqid;
        console.log('Ok, doing redirection to ', data.redirect);
        try {
          const jopenCheckResponse =
            await VonageVerifySilentAuthModule.openWithDataCellular(
              data.redirect,
              true,
            );
          const openCheckResponse = JSON.parse(jopenCheckResponse);
          console.log('Redirect response: ', openCheckResponse);
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
      updateStatus(index, 'allow');
    }
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
  var defaultTasks = [
    {
      id: 0,
      tag: 'fd',
      name: 'Fraud\nDefender',
      desc: '',
      prompt:
        'Using the Vonage Fraud Defender APIs to check the number fraud indicators',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getFd',
      icon: fileq,
    },
    /*
    {
      id: 1,
      tag: 'fraud',
      name: 'Number\nFraud',
      desc: '',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getFraud',
    },
    */
    {
      id: 1,
      tag: 'simswap',
      name: 'SIM\nSwap',
      desc: '',
      prompt: 'Checking if the SIM has been recently swapped',
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
      name: 'Number\nVerification',
      desc: '',
      prompt: 'Verifying that this device is actually the number indicated',
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
      prompt: 'Using Network Location APIs to detect fraudulent access',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getLocation',
      icon: fileq,
    },
    {
      id: 4,
      tag: 'facial',
      name: 'Facial\nLiveness',
      desc: '',
      prompt: 'Checking facial Liveness to prevent AI/Bots',
      active: true,
      live: true,
      status: '-1',
      results: '',
      url: '/getFacial',
      icon: fileq,
    },
  ];
  var copyTasks = [...defaultTasks];
  const [tasks, setTasks] = useState(copyTasks);
  useEffect(() => {
    async function fetchSettings() {
      var val;
      val = await AsyncStorage.getItem('fast');
      if (val == 'true') {
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
    bcolor = '#ECFFDC'; // Good
    setShowVideo(true);
    console.log('Show Video set to true');
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
      await getFd(state);
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
    tasks.map(task => {
      console.log('Setting: ', task.tag, task.active);
      AsyncStorage.setItem(task.tag, '' + task.active);
    });
  };

  const sendUDP = async () => {
    console.log('Creating UDP socket, sending to ', udpUrl, udpPort);
    const socket = dgram.createSocket({type: 'udp4', debug: true});
    socket.bind();
    socket.once('listening', function () {
      socket.send(
        'VIDS',
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
  const loginHandler = async () => {
    console.log('Pressed the button');
    reset();
    setInProcess(true);
    console.log('After Dialog');
    var skip = false;
    if (fast) {
      console.log('Starting fast loop');
      for (let step = 0; step < tasks.length; step++) {
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
          await getFd(step);
        }
      }
      if (!skip) {
        console.log('Setting done in fast mode');
        setDone(true);
      }
    } else {
      alterState(0);
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
  const reset = async () => {
    console.log('Reset!');
    const newTasks = tasks.map((c, i) => {
      c.status = -1;
      c.desc = '';
      return c;
    });
    setTasks(newTasks);
    setShowVideo(false);
    setInProcess(false);
    setFacial(false);
    setDone(false);
    setPopup(false);
    setWarning(false);
    preFacial = false;

    //await AsyncStorage.clear();
  };
  return (
    <SafeAreaView style={backgroundStyle}>
      {true && (
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
      )}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={[
          {backgroundColor: showVideo ? bcolor : Colors.lighter}, //#ECFFDC
          {height: '100%'},
        ]}>
        {facial && (
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
        )}
        {warning && (
          <View
            onTouchStart={() => {
              setWarning(false);
            }}>
            <Modal
              style={[styles.settings, {backgroundColor: 'red'}]}
              isVisible={warning}>
              <Video
                source={rvideo}
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
        )}
        {splash && (
          <View
            onTouchStart={() => {
              setSplash(false);
            }}>
            <Modal
              style={[styles.settings, {backgroundColor: 'lightgray'}]}
              isVisible={splash}>
              <Image
                source={require('../images/VonagePOE_Primary.png')}
                style={[
                  {width: 240, height: 80, marginTop: -120, marginLeft: -150},
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
                  {width: 340, height: 80, marginTop: 20},
                ]}></Image>
              <Image
                source={require('../images/aduna.png')}
                style={[
                  styles.video,
                  {width: 300,height: 100, marginTop: 20},
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
                    color: 'blue',
                    marginTop: 70,
                  },
                ]}>
                Touch anywhere to dismiss
              </Text>
            </Modal>
          </View>
        )}
        {popup && (
          <View>
            <Modal
              style={[styles.settings]}
              transparent={false}
              isVisible={popup}>
              <View style={styles.container}>
                <Text
                  style={[
                    styles.text,
                    {
                      color: isDarkMode ? Colors.white : Colors.black,
                    },
                  ]}>
                  {tasks[state].name.replace(/\n/g, ' ')}
                  {'\n\n'}
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
                  Results:
                  {'\n'}
                </Text>
                {tasks[state].status == -4 ? (
                  <View style={styles.icon}>
                    <ActivityIndicator color={'blue'} size="large" />
                  </View>
                ) : (
                  <Image source={tasks[state].icon} style={styles.icon}></Image>
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
        )}
        {settings && (
          <View>
            <Modal
              style={[styles.settings]}
              transparent={false}
              isVisible={settings}>
              <Text
                style={[
                  styles.text,
                  {
                    color: isDarkMode ? Colors.white : Colors.black,
                  },
                ]}>
                Settings
              </Text>
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
                  marginTop: 20,
                  marginLeft: -10,
                }}
                onPress={(isChecked: boolean) => {
                  setDemo(isChecked);
                  if (isChecked) {
                    setSandbox(false);
                  }
                }}
              />
              <BouncyCheckbox
                key={-3}
                size={30}
                text={'Use Playground'}
                isChecked={sandbox}
                innerIconStyle={{borderWidth: 4}}
                textStyle={{
                  textDecorationLine: 'none',
                  fontSize: 30,
                }}
                style={{
                  width: '90%',
                  marginTop: 20,
                  marginBottom: 40,
                  marginLeft: -10,
                }}
                onPress={(isChecked: boolean) => {
                  setSandbox(isChecked);
                  if (isChecked) {
                    setDemo(false);
                  }
                }}
              />
              {tasks.map(task => {
                var name = task.name.replace(/\n/g, ' ');
                return (
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
                    }}
                  />
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
        )}
        {showVideo ? (
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
            {countryCode && (
              <PhoneInput
                containerStyle={styles.phone}
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
            )}
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
            <Text style={styles.buttonText}>Enter the Vault</Text>
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
            return (
              <Section key={task.id}>
                <FraudCheck
                  value={task.status}
                  title={task.name}
                  description={task.desc}
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
          <TouchableOpacity onPress={reset}>
            <Image
              style={[styles.smallIcon, {width: 40}]}
              source={require('../images/reset.png')}></Image>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSettings(true);
            }}>
            <Image
              style={[styles.smallIcon]}
              source={require('../images/settings.png')}></Image>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
export default MainScreen;
