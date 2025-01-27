/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

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
  Button,
  ActivityIndicator,
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

var phone = '14083753079';
var started = null;
var gPhone;
var vUrl = 'https://neru-ef3346a6-debug-vault.use1.runtime.vonage.cloud';
var phase = 0;
var faceUrl = 'https://main.d3sn8is0cbxe5o.amplifyapp.com';
var udpUrl = vUrl;
var udpPort = 41234;
const filex = require('../images/redx2.gif');
const fileq = require('../images/qmark.png');
const filec = require('../images/greencheck1.gif');
const fileu = require('../images/unused.png');
const filee = require('../images/exclamation.png');
const filel = require('../images/loading.gif');
var deviceId;
var myLoc;
getUniqueId().then(id => {
  deviceId = id;
  console.log('Initialized deviceId: ', deviceId);
});
try {
  GetLocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 2000,
  }).then(loc => {
    myLoc = loc;
    console.log('Got location: ', myLoc);
  });
} catch (err) {
  console.log('Problem getting location');
}

type SectionProps = PropsWithChildren<{
  title: string;
}>;
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const Header = (): Node => {
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

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
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
    } else if (results == 'loading') {
      console.log('Setting loading');
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
  async function getFd(index) {
    if (index == null || !tasks[index].active) {
      console.log('Not using ', index);
      updateStatus(index, 'unused', 'Unused');
      return;
    }
    var data;
    console.log('in getFd for index ', index, demo);
    updateStatus(index, 'loading');

    let body = {
      phone: '' + gPhone,
      product: 'vault',
      id: deviceId,
      sandbox: sandbox,
      demo: demo,
    };
    if (tasks[index].tag == 'location') {
      body.location = myLoc;
    }
    if (!demo) {
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
  useEffect(() => {}, []);
  useEffect(() => {
    console.log('In useEffect for number stuff: ', inputNumber, countryCode);
    if (!inputNumber || !countryCode) return;
    const phoneNumber = parsePhoneNumber(inputNumber, countryCode);
    console.log('Validating: ', inputNumber, countryCode, phoneNumber);
    if (phoneNumber?.isValid()) {
      console.log('Setting validation true and writing: ', phoneNumber.number);
      AsyncStorage.setItem('@phone', phoneNumber.number);
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
    sendUDP();
    setInProcess(false);
    setFacial(false);
  }, [done]);
  useEffect(() => {
    console.log('useEffect for state: ', state);
    if (state == null || !tasks[state]) {
      setInProcess(false);
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
    }
  }, [state]);

  const sendUDP = async () => {
    console.log('Creating UDP socket');
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
    if (fast) {
      console.log('Starting fast loop');
      for (let step = 0; step < tasks.length; step++) {
        console.log('Loop value: ', step);
        if (tasks[step].tag == 'facial') {
          if (tasks[step].active) {
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
      //      sendUDP();
      //      setInProcess(false);
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
    alterState(step + 1);
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
    setInProcess(false);
    setFacial(false);
    setDone(false);
    setPopup(false);
    preFacial = false;
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
        style={[backgroundStyle, {height: '100%'}]}>
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
                }}
              />
              <BouncyCheckbox
                key={-3}
                size={30}
                text={'Use Sandbox'}
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
                    setSettings(false);
                  }}
                />
              </View>
            </Modal>
          </View>
        )}
        <Header />
        {countryCode && (
          <View
            style={[
              styles.container,
              {
                backgroundColor: isDarkMode ? Colors.black : '',
              },
            ]}>
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
        )}
        <View
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
