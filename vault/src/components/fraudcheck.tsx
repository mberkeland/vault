import {Image, Text, View} from 'react-native';

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
  return (
    <View style={{height: 60}}>
      <Image source={file} style={styles.icon}></Image>
      <Text style={[styles.checkText]}>{title}</Text>
      <Text style={[styles.checkText2, {color: color}]}>{description}</Text>
    </View>
  );
}
