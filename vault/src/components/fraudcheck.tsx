import {Image, Text, View, ActivityIndicator} from 'react-native';

import {styles} from '../app/styles';
export type FraudCheckProps = {
  title?: string;
  description?: string;
  value?: number;
};
const filex = require('../images/redx2.gif');
const fileq = require('../images/qmark.png');
const filec = require('../images/greencheck1.gif');
const fileu = require('../images/unused.png');
const filee = require('../images/exclamation.png');
const filel = require('../images/loading.gif');

export function FraudCheck({title, description, value}: FraudCheckProps) {
  var file = fileq;
  var color = 'black';
  if (value == 0) {
    file = filex;
    color = 'red';
  }
  if (value == 1) {
    file = filec;
    color = 'green';
  }
  if (value == -3) {
    file = fileu;
    color = 'darkgray';
  }
  if (value == -2) {
    file = filee;
    color = 'orange';
  }
  if (value == -4) {
    file = filel;
    color = 'blue';
  }

  return (
    <View style={{height: 60}}>
      {value == -4 ? (
        <View style={styles.icon}>
          <ActivityIndicator color={'blue'} size="large" />
        </View>
      ) : (
        <Image source={file} style={styles.icon}></Image>
      )}
      <Text style={[styles.checkText]}>{title}</Text>
      <Text style={[styles.checkText2, {color: color}]}>{description}</Text>
    </View>
  );
}
